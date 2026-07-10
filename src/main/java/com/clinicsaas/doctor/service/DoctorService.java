package com.clinicsaas.doctor.service;

import com.clinicsaas.auth.domain.Role;
import com.clinicsaas.auth.domain.User;
import com.clinicsaas.auth.repository.UserRepository;
import com.clinicsaas.common.audit.AuditLogService;
import com.clinicsaas.common.exception.CustomException;
import com.clinicsaas.common.tenant.TenantContext;
import com.clinicsaas.doctor.domain.Doctor;
import com.clinicsaas.doctor.dto.DoctorRequestDto;
import com.clinicsaas.doctor.dto.DoctorResponseDto;
import com.clinicsaas.doctor.repository.DoctorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class DoctorService {

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuditLogService auditLogService;

    @Transactional
    public DoctorResponseDto createDoctor(DoctorRequestDto dto) {
        UUID clinicId = getClinicIdFromContext();

        if (userRepository.existsByEmail(dto.getEmail())) {
            throw new CustomException("Email is already registered in this system", HttpStatus.BAD_REQUEST, "EMAIL_ALREADY_EXISTS");
        }

        // 1. Create system user
        User user = new User();
        user.setClinicId(clinicId);
        user.setName(dto.getName());
        user.setEmail(dto.getEmail());
        user.setPhone(dto.getPhone());
        user.setPasswordHash(passwordEncoder.encode(dto.getPassword()));
        user.setRole(Role.DOCTOR);
        user.setStatus("ACTIVE");
        user = userRepository.save(user);

        // 2. Create Doctor profile
        Doctor doctor = new Doctor();
        doctor.setClinicId(clinicId);
        doctor.setUser(user);
        doctor.setName(dto.getName());
        doctor.setSpecialization(dto.getSpecialization());
        doctor.setRegistrationNumber(dto.getRegistrationNumber());
        doctor.setConsultationFee(dto.getConsultationFee());
        doctor.setStatus("ACTIVE");
        doctor = doctorRepository.save(doctor);

        // 3. Audit
        auditLogService.logAction("DOCTOR_CREATED", "DOCTOR", doctor.getId(), 
                "Created doctor " + doctor.getName() + " linked to user email " + dto.getEmail());

        return mapToDto(doctor);
    }

    @Transactional
    public DoctorResponseDto updateDoctor(UUID id, DoctorRequestDto dto) {
        UUID clinicId = getClinicIdFromContext();

        Doctor doctor = doctorRepository.findByIdAndClinicIdAndStatus(id, clinicId, "ACTIVE")
                .orElseThrow(() -> new CustomException("Doctor profile not found", HttpStatus.NOT_FOUND, "DOCTOR_NOT_FOUND"));

        User user = doctor.getUser();
        
        // Update user properties
        user.setName(dto.getName());
        user.setPhone(dto.getPhone());
        if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(dto.getPassword()));
        }
        userRepository.save(user);

        // Update doctor profile
        doctor.setName(dto.getName());
        doctor.setSpecialization(dto.getSpecialization());
        doctor.setRegistrationNumber(dto.getRegistrationNumber());
        doctor.setConsultationFee(dto.getConsultationFee());
        doctor = doctorRepository.save(doctor);

        // Audit
        auditLogService.logAction("DOCTOR_UPDATED", "DOCTOR", doctor.getId(), 
                "Updated doctor profile and credentials for " + doctor.getName());

        return mapToDto(doctor);
    }

    @Transactional(readOnly = true)
    public DoctorResponseDto getDoctorById(UUID id) {
        UUID clinicId = getClinicIdFromContext();
        Doctor doctor = doctorRepository.findByIdAndClinicIdAndStatus(id, clinicId, "ACTIVE")
                .orElseThrow(() -> new CustomException("Doctor not found", HttpStatus.NOT_FOUND, "DOCTOR_NOT_FOUND"));
        return mapToDto(doctor);
    }

    @Transactional(readOnly = true)
    public List<DoctorResponseDto> getAllDoctors() {
        UUID clinicId = getClinicIdFromContext();
        List<Doctor> doctors = doctorRepository.findByClinicIdAndStatus(clinicId, "ACTIVE");
        return doctors.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Transactional
    public void deleteDoctor(UUID id) {
        UUID clinicId = getClinicIdFromContext();
        Doctor doctor = doctorRepository.findByIdAndClinicIdAndStatus(id, clinicId, "ACTIVE")
                .orElseThrow(() -> new CustomException("Doctor not found", HttpStatus.NOT_FOUND, "DOCTOR_NOT_FOUND"));

        // Soft delete: status = INACTIVE
        doctor.setStatus("INACTIVE");
        doctorRepository.save(doctor);

        User user = doctor.getUser();
        user.setStatus("INACTIVE");
        userRepository.save(user);

        // Audit
        auditLogService.logAction("DOCTOR_DELETED", "DOCTOR", doctor.getId(), 
                "Soft-deleted doctor profile and user account for " + doctor.getName());
    }

    private UUID getClinicIdFromContext() {
        String clinicIdStr = TenantContext.getTenantId();
        if (clinicIdStr == null) {
            throw new CustomException("No active clinic context found", HttpStatus.BAD_REQUEST, "NO_CLINIC_CONTEXT");
        }
        return UUID.fromString(clinicIdStr);
    }

    private DoctorResponseDto mapToDto(Doctor doc) {
        DoctorResponseDto response = new DoctorResponseDto();
        response.setId(doc.getId());
        response.setClinicId(doc.getClinicId());
        response.setUserId(doc.getUser().getId());
        response.setName(doc.getName());
        response.setSpecialization(doc.getSpecialization());
        response.setRegistrationNumber(doc.getRegistrationNumber());
        response.setConsultationFee(doc.getConsultationFee());
        response.setEmail(doc.getUser().getEmail());
        response.setPhone(doc.getUser().getPhone());
        response.setStatus(doc.getStatus());
        response.setVersion(doc.getVersion());
        return response;
    }
}
