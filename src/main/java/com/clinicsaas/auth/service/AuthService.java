package com.clinicsaas.auth.service;

import com.clinicsaas.auth.domain.Clinic;
import com.clinicsaas.auth.domain.Role;
import com.clinicsaas.auth.domain.User;
import com.clinicsaas.auth.dto.AuthResponse;
import com.clinicsaas.auth.dto.CreateUserRequest;
import com.clinicsaas.auth.dto.LoginRequest;
import com.clinicsaas.auth.dto.RegisterRequest;
import com.clinicsaas.auth.repository.ClinicRepository;
import com.clinicsaas.auth.repository.UserRepository;
import com.clinicsaas.common.audit.AuditLogService;
import com.clinicsaas.common.exception.CustomException;
import com.clinicsaas.common.tenant.TenantContext;
import com.clinicsaas.doctor.domain.Doctor;
import com.clinicsaas.doctor.repository.DoctorRepository;
import com.clinicsaas.auth.domain.PasswordResetToken;
import com.clinicsaas.auth.repository.PasswordResetTokenRepository;
import com.clinicsaas.notification.email.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import java.util.Base64;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ClinicRepository clinicRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Autowired
    private EmailService emailService;

    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public AuthResponse registerTenant(RegisterRequest request) {
        // Validate globally unique email
        if (userRepository.existsByEmail(request.getAdminEmail())) {
            throw new CustomException("Email already registered", HttpStatus.BAD_REQUEST, "EMAIL_ALREADY_EXISTS");
        }

        // Validate globally unique clinic email
        if (clinicRepository.existsByEmail(request.getClinicEmail())) {
            throw new CustomException("Clinic email already registered", HttpStatus.BAD_REQUEST, "CLINIC_EMAIL_ALREADY_EXISTS");
        }

        String clinicCode = request.getClinicCode();
        if (clinicCode == null || clinicCode.isBlank()) {
            clinicCode = generateClinicCode(request.getClinicName());
        } else {
            clinicCode = clinicCode.toLowerCase().replaceAll("[^a-z0-9]+", "-");
            if (clinicRepository.findByClinicCode(clinicCode).isPresent()) {
                throw new CustomException("Clinic code already exists", HttpStatus.BAD_REQUEST, "CLINIC_CODE_ALREADY_EXISTS");
            }
        }

        UUID clinicId = UUID.randomUUID();

        // 1. Save Clinic
        Clinic clinic = new Clinic();
        clinic.setId(clinicId);
        clinic.setClinicCode(clinicCode);
        clinic.setName(request.getClinicName());
        clinic.setOwnerName(request.getOwnerName());
        clinic.setPhone(request.getClinicPhone());
        clinic.setEmail(request.getClinicEmail());
        clinic.setAddress(request.getClinicAddress());
        clinic.setStatus("ACTIVE");
        clinic = clinicRepository.save(clinic);

        // 2. Save Admin User
        User admin = new User();
        admin.setClinicId(clinicId);
        admin.setName(request.getAdminName());
        admin.setEmail(request.getAdminEmail());
        admin.setPhone(request.getAdminPhone());
        admin.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        admin.setRole(Role.ADMIN);
        admin.setStatus("ACTIVE");
        admin = userRepository.save(admin);

        // 3. Generate tokens
        String accessToken = jwtService.generateAccessToken(admin.getEmail(), admin.getId(), clinicId.toString(), Role.ADMIN.name(), false);
        String refreshToken = jwtService.generateRefreshToken(admin.getEmail(), admin.getId(), clinicId.toString());

        // 4. Audit Log
        auditLogService.logAction(admin.getId(), clinicId, "CLINIC_REGISTERED", "CLINIC", clinicId, 
                "Registered clinic " + request.getClinicName() + " with admin email " + request.getAdminEmail());

        return new AuthResponse(accessToken, refreshToken, admin.getEmail(), admin.getName(), clinicId.toString(), clinic.getClinicCode(), Role.ADMIN.name());
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        // Resolve clinic code
        Clinic clinic = clinicRepository.findByClinicCode(request.getClinicCode())
                .orElseThrow(() -> new CustomException("Clinic not found with code: " + request.getClinicCode(), HttpStatus.NOT_FOUND, "CLINIC_NOT_FOUND"));

        // Find user in this clinic
        User user = userRepository.findByEmailAndClinicIdAndStatus(request.getEmail(), clinic.getId(), "ACTIVE")
                .orElseThrow(() -> new CustomException("Invalid email or password", HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS"));

        // Match password
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new CustomException("Invalid email or password", HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS");
        }

        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        // Check if user is doctor
        boolean isDoctor = user.getRole() == Role.DOCTOR;
        if (isDoctor) {
            // Verify doctor profile exists
            Optional<Doctor> docProfile = doctorRepository.findByUserIdAndClinicId(user.getId(), clinic.getId());
            if (docProfile.isEmpty()) {
                throw new CustomException("Doctor profile configuration missing", HttpStatus.FORBIDDEN, "DOCTOR_PROFILE_MISSING");
            }
        }

        String accessToken = jwtService.generateAccessToken(user.getEmail(), user.getId(), clinic.getId().toString(), user.getRole().name(), isDoctor);
        String refreshToken = jwtService.generateRefreshToken(user.getEmail(), user.getId(), clinic.getId().toString());

        // Audit Log
        auditLogService.logAction(user.getId(), clinic.getId(), "USER_LOGIN", "USER", user.getId(), "User logged in successfully");

        return new AuthResponse(accessToken, refreshToken, user.getEmail(), user.getName(), clinic.getId().toString(), clinic.getClinicCode(), user.getRole().name());
    }

    @Transactional
    public AuthResponse refreshAccessToken(String refreshTokenString) {
        if (!jwtService.isTokenValid(refreshTokenString)) {
            throw new CustomException("Invalid refresh token", HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN");
        }

        String tokenType = jwtService.extractTokenType(refreshTokenString);
        if (!"REFRESH".equals(tokenType)) {
            throw new CustomException("Token is not a refresh token", HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN");
        }

        String email = jwtService.extractUsername(refreshTokenString);
        String clinicIdStr = jwtService.extractTenantId(refreshTokenString);
        String userIdStr = jwtService.extractUserId(refreshTokenString);

        User user = userRepository.findByEmailAndClinicIdAndStatus(email, UUID.fromString(clinicIdStr), "ACTIVE")
                .orElseThrow(() -> new CustomException("User not found or inactive", HttpStatus.UNAUTHORIZED, "USER_NOT_FOUND"));

        boolean isDoctor = user.getRole() == Role.DOCTOR;
        String newAccessToken = jwtService.generateAccessToken(user.getEmail(), user.getId(), clinicIdStr, user.getRole().name(), isDoctor);
        String newRefreshToken = jwtService.generateRefreshToken(user.getEmail(), user.getId(), clinicIdStr);

        return new AuthResponse(newAccessToken, newRefreshToken, user.getEmail(), user.getName(), clinicIdStr, "", user.getRole().name());
    }

    @Transactional
    public void createUser(CreateUserRequest request) {
        String currentTenant = TenantContext.getTenantId();
        if (currentTenant == null) {
            throw new CustomException("No active clinic context found", HttpStatus.BAD_REQUEST, "NO_CLINIC_CONTEXT");
        }

        UUID clinicId = UUID.fromString(currentTenant);

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new CustomException("Email already registered", HttpStatus.BAD_REQUEST, "EMAIL_ALREADY_EXISTS");
        }

        User user = new User();
        user.setClinicId(clinicId);
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole());
        user.setStatus("ACTIVE");
        user = userRepository.save(user);

        // Audit Log
        auditLogService.logAction(user.getId(), clinicId, "USER_CREATED", "USER", user.getId(), 
                "Created user: " + user.getName() + " with role: " + user.getRole());
    }

    private String generateClinicCode(String clinicName) {
        String base = clinicName.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");
        if (base.isEmpty()) {
            base = "clinic";
        }
        String code = base;
        int count = 1;
        while (clinicRepository.findByClinicCode(code).isPresent()) {
            code = base + "-" + (int)(Math.random() * 1000) + count;
            count++;
        }
        return code;
    }

    @Transactional
    public void generatePasswordResetToken(String email, String clinicCode) {
        // Resolve clinic code
        Optional<Clinic> clinicOpt = clinicRepository.findByClinicCode(clinicCode);
        if (clinicOpt.isEmpty()) {
            return; // Act like it worked to prevent enumeration
        }

        // Find user in this clinic specifically
        Optional<User> userOpt = userRepository.findByEmailAndClinicIdAndStatus(email, clinicOpt.get().getId(), "ACTIVE");
        if (userOpt.isEmpty()) {
            return; // Act like it worked
        }
        User user = userOpt.get();

        // Ensure only one active token per user by deleting existing ones
        passwordResetTokenRepository.deleteByUser(user);
        passwordResetTokenRepository.flush(); // Force delete before insert to avoid unique constraint violation

        // Generate cryptographically secure token (32 bytes -> Base64 URL safe)
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        // Hash the token to store in the database (SHA-256)
        String hashedToken = hashToken(rawToken);

        // Save to DB with 30 minute expiry
        PasswordResetToken resetToken = new PasswordResetToken(user, hashedToken, LocalDateTime.now().plusMinutes(30));
        passwordResetTokenRepository.save(resetToken);

        // Send email with the RAW token
        System.out.println("DEBUG - GENERATED rawToken: [" + rawToken + "]");
        emailService.sendPasswordResetEmail(user.getEmail(), rawToken);
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        // Enforce basic password policy check before processing token
        if (newPassword == null || newPassword.length() < 8) {
            throw new CustomException("Password must be at least 8 characters long", HttpStatus.BAD_REQUEST, "WEAK_PASSWORD");
        }
        
        rawToken = rawToken.trim();
        String hashedToken = hashToken(rawToken);
        System.out.println("DEBUG - Received rawToken: [" + rawToken + "]");
        System.out.println("DEBUG - Computed hashedToken: [" + hashedToken + "]");

        PasswordResetToken resetToken = passwordResetTokenRepository.findByTokenHash(hashedToken)
                .orElseThrow(() -> new CustomException("Invalid or expired reset token", HttpStatus.BAD_REQUEST, "INVALID_TOKEN"));

        if (resetToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            passwordResetTokenRepository.delete(resetToken);
            throw new CustomException("Reset token has expired", HttpStatus.BAD_REQUEST, "EXPIRED_TOKEN");
        }

        User user = resetToken.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Delete the token immediately after successful use
        passwordResetTokenRepository.delete(resetToken);
        
        auditLogService.logAction(user.getId(), user.getClinicId(), "PASSWORD_RESET", "USER", user.getId(), "User reset their password");
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(rawToken.getBytes());
            return Base64.getEncoder().encodeToString(hashBytes);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Failed to hash token", e);
        }
    }
}
