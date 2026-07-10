package com.clinicsaas.patient.service;

import com.clinicsaas.common.audit.AuditLogService;
import com.clinicsaas.common.exception.CustomException;
import com.clinicsaas.common.tenant.TenantContext;
import com.clinicsaas.patient.domain.Patient;
import com.clinicsaas.patient.dto.PatientRegistrationDto;
import com.clinicsaas.patient.dto.PatientResponseDto;
import com.clinicsaas.patient.repository.PatientRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service
public class PatientService {

    @Autowired
    private PatientRepository patientRepository;


    @Transactional
    public PatientResponseDto registerPatient(PatientRegistrationDto dto) {
        UUID clinicId = getClinicIdFromContext();

        // 1. Duplicate phone detection
        if (patientRepository.existsByClinicIdAndPhoneAndStatus(clinicId, dto.getPhone(), "ACTIVE")) {
            throw new CustomException("Patient with this phone number already exists in this clinic", HttpStatus.BAD_REQUEST, "DUPLICATE_PHONE_NUMBER");
        }

        // 2. Generate sequential patient code
        long count = patientRepository.countByClinicId(clinicId);
        String patientCode = "PT-" + String.format("%06d", count + 1);

        Patient patient = new Patient();
        patient.setClinicId(clinicId);
        patient.setPatientCode(patientCode);
        patient.setName(dto.getName());
        patient.setPhone(dto.getPhone());
        patient.setGender(dto.getGender());
        patient.setDateOfBirth(dto.getDateOfBirth());
        patient.setAddress(dto.getAddress());
        patient.setBloodGroup(dto.getBloodGroup());
        patient.setStatus("ACTIVE");

        patient = patientRepository.save(patient);


        return mapToDto(patient);
    }

    @Transactional
    public PatientResponseDto updatePatient(UUID id, PatientRegistrationDto dto) {
        UUID clinicId = getClinicIdFromContext();

        Patient patient = patientRepository.findByIdAndClinicIdAndStatus(id, clinicId, "ACTIVE")
                .orElseThrow(() -> new CustomException("Patient not found", HttpStatus.NOT_FOUND, "PATIENT_NOT_FOUND"));

        // Check if phone number is updated and duplicate exists
        if (!patient.getPhone().equals(dto.getPhone()) && 
            patientRepository.existsByClinicIdAndPhoneAndStatus(clinicId, dto.getPhone(), "ACTIVE")) {
            throw new CustomException("Patient with this phone number already exists in this clinic", HttpStatus.BAD_REQUEST, "DUPLICATE_PHONE_NUMBER");
        }

        patient.setName(dto.getName());
        patient.setPhone(dto.getPhone());
        patient.setGender(dto.getGender());
        patient.setDateOfBirth(dto.getDateOfBirth());
        patient.setAddress(dto.getAddress());
        patient.setBloodGroup(dto.getBloodGroup());

        patient = patientRepository.save(patient);


        return mapToDto(patient);
    }

    @Transactional(readOnly = true)
    public PatientResponseDto getPatientById(UUID id) {
        UUID clinicId = getClinicIdFromContext();
        Patient patient = patientRepository.findByIdAndClinicIdAndStatus(id, clinicId, "ACTIVE")
                .orElseThrow(() -> new CustomException("Patient not found", HttpStatus.NOT_FOUND, "PATIENT_NOT_FOUND"));
        return mapToDto(patient);
    }

    @Transactional(readOnly = true)
    public Page<PatientResponseDto> searchPatients(String search, Pageable pageable) {
        UUID clinicId = getClinicIdFromContext();
        Page<Patient> patients = patientRepository.searchPatients(clinicId, search, pageable);
        return patients.map(this::mapToDto);
    }

    @Transactional
    public void deletePatient(UUID id) {
        UUID clinicId = getClinicIdFromContext();
        Patient patient = patientRepository.findByIdAndClinicIdAndStatus(id, clinicId, "ACTIVE")
                .orElseThrow(() -> new CustomException("Patient not found", HttpStatus.NOT_FOUND, "PATIENT_NOT_FOUND"));

        patient.setStatus("INACTIVE");
        patientRepository.save(patient);

    }

    private UUID getClinicIdFromContext() {
        String clinicIdStr = TenantContext.getTenantId();
        if (clinicIdStr == null) {
            throw new CustomException("No active clinic context found", HttpStatus.BAD_REQUEST, "NO_CLINIC_CONTEXT");
        }
        return UUID.fromString(clinicIdStr);
    }

    private PatientResponseDto mapToDto(Patient patient) {
        PatientResponseDto dto = new PatientResponseDto();
        dto.setId(patient.getId());
        dto.setClinicId(patient.getClinicId());
        dto.setPatientCode(patient.getPatientCode());
        dto.setName(patient.getName());
        dto.setPhone(patient.getPhone());
        dto.setGender(patient.getGender());
        dto.setDateOfBirth(patient.getDateOfBirth());
        dto.setAddress(patient.getAddress());
        dto.setBloodGroup(patient.getBloodGroup());
        dto.setStatus(patient.getStatus());
        dto.setVersion(patient.getVersion());
        dto.setCreatedAt(patient.getCreatedAt());
        dto.setUpdatedAt(patient.getUpdatedAt());
        return dto;
    }
}
