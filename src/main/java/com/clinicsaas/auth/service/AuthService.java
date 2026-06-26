package com.clinicsaas.auth.service;

import com.clinicsaas.auth.domain.Role;
import com.clinicsaas.auth.domain.User;
import com.clinicsaas.auth.domain.UserTenantRole;
import com.clinicsaas.auth.dto.AuthResponse;
import com.clinicsaas.auth.dto.CreateUserRequest;
import com.clinicsaas.auth.dto.LoginRequest;
import com.clinicsaas.auth.dto.RegisterRequest;
import com.clinicsaas.auth.repository.UserRepository;
import com.clinicsaas.auth.repository.UserTenantRoleRepository;
import com.clinicsaas.common.exception.CustomException;
import com.clinicsaas.common.tenant.TenantContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserTenantRoleRepository userTenantRoleRepository;

    @Autowired
    private com.clinicsaas.auth.repository.ClinicRepository clinicRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Transactional
    public AuthResponse registerTenant(RegisterRequest request) {
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new CustomException("Username already exists", HttpStatus.BAD_REQUEST);
        }

        UUID tenantId = UUID.randomUUID();
        String clinicCode = generateClinicCode(request.getClinicName());

        com.clinicsaas.auth.domain.Clinic clinic = new com.clinicsaas.auth.domain.Clinic();
        clinic.setId(tenantId);
        clinic.setName(request.getClinicName());
        clinic.setCode(clinicCode);
        clinicRepository.save(clinic);

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setEmail(request.getEmail());
        user.setFullName(request.getFullName());
        user = userRepository.save(user);

        // Set TenantContext temporarily for this transaction write
        TenantContext.setTenantId(tenantId.toString());

        UserTenantRole mapping = new UserTenantRole();
        mapping.setUser(user);
        mapping.setRole(Role.ADMIN);
        mapping.setDoctor(false);
        userTenantRoleRepository.save(mapping);

        String token = jwtService.generateToken(user.getUsername(), tenantId.toString(), Role.ADMIN.name(), false);
        return new AuthResponse(token, user.getUsername(), tenantId.toString(), clinicCode, Role.ADMIN.name(), false);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new CustomException("Invalid username or password", HttpStatus.UNAUTHORIZED));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new CustomException("Invalid username or password", HttpStatus.UNAUTHORIZED);
        }

        com.clinicsaas.auth.domain.Clinic clinic = clinicRepository.findByCode(request.getClinicCode())
                .orElseThrow(() -> new CustomException("Clinic not found with code: " + request.getClinicCode(), HttpStatus.NOT_FOUND));

        String tenantId = clinic.getId().toString();

        // Set TenantContext to validate user's tenant role mapping
        TenantContext.setTenantId(tenantId);

        UserTenantRole roleMapping = userTenantRoleRepository.findByUserIdAndTenantId(user.getId(), UUID.fromString(tenantId))
                .orElseThrow(() -> new CustomException("User is not authorized for this clinic", HttpStatus.FORBIDDEN));

        boolean isDoctor = roleMapping.getRole() == Role.DOCTOR || roleMapping.isDoctor();
        String token = jwtService.generateToken(
                user.getUsername(),
                tenantId,
                roleMapping.getRole().name(),
                isDoctor
        );

        return new AuthResponse(token, user.getUsername(), tenantId, clinic.getCode(), roleMapping.getRole().name(), isDoctor);
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
        while (clinicRepository.findByCode(code).isPresent()) {
            code = base + "-" + (int)(Math.random() * 1000) + count;
            count++;
        }
        return code;
    }

    @Transactional
    public void createUser(CreateUserRequest request) {
        String currentTenant = TenantContext.getTenantId();
        if (currentTenant == null) {
            throw new CustomException("No active tenant context found", HttpStatus.BAD_REQUEST);
        }

        User user = userRepository.findByUsername(request.getUsername()).orElse(null);
        if (user == null) {
            user = new User();
            user.setUsername(request.getUsername());
            user.setPassword(passwordEncoder.encode(request.getPassword()));
            user.setEmail(request.getEmail());
            user.setFullName(request.getFullName());
            user = userRepository.save(user);
        }

        // Check if role mapping already exists in this tenant
        Optional<UserTenantRole> existingRole = userTenantRoleRepository.findByUserIdAndTenantId(user.getId(), UUID.fromString(currentTenant));
        if (existingRole.isPresent()) {
            throw new CustomException("User already belongs to this clinic", HttpStatus.BAD_REQUEST);
        }

        UserTenantRole mapping = new UserTenantRole();
        mapping.setUser(user);
        mapping.setRole(request.getRole());
        mapping.setDoctor(request.isDoctor() || request.getRole() == Role.DOCTOR);
        userTenantRoleRepository.save(mapping);
    }
}
