package com.clinicsaas.patient.service;

import com.clinicsaas.common.exception.CustomException;
import com.clinicsaas.patient.domain.Patient;
import com.clinicsaas.patient.domain.PatientAddress;
import com.clinicsaas.patient.dto.PatientRegistrationDto;
import com.clinicsaas.patient.dto.PatientResponseDto;
import com.clinicsaas.patient.repository.PatientRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PatientService {

    @Autowired
    private PatientRepository patientRepository;

    @Transactional
    public PatientResponseDto registerPatient(PatientRegistrationDto dto) {
        if (!dto.getConsentGiven()) {
            throw new CustomException("Demonstrable consent is mandatory for collecting patient health data", HttpStatus.BAD_REQUEST);
        }

        Patient patient = new Patient();
        patient.setName(dto.getName());
        patient.setEmail(dto.getEmail());
        patient.setPhone(dto.getPhone());
        patient.setDateOfBirth(dto.getDateOfBirth());
        patient.setGender(dto.getGender());
        patient.setConsentGivenAt(LocalDateTime.now());

        PatientAddress address = new PatientAddress();
        address.setStreet(dto.getStreet());
        address.setCity(dto.getCity());
        address.setState(dto.getState());
        address.setPostalCode(dto.getPostalCode());
        patient.setAddress(address);

        patient = patientRepository.save(patient);
        return mapToDto(patient);
    }

    @Transactional(readOnly = true)
    public PatientResponseDto getPatientById(UUID id) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new CustomException("Patient not found", HttpStatus.NOT_FOUND));
        return mapToDto(patient);
    }

    @Transactional(readOnly = true)
    public List<PatientResponseDto> getAllPatients() {
        List<Patient> patients = patientRepository.findAll();
        return patients.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    private PatientResponseDto mapToDto(Patient patient) {
        PatientResponseDto dto = new PatientResponseDto();
        dto.setId(patient.getId());
        dto.setName(patient.getName());
        dto.setEmail(patient.getEmail());
        dto.setPhone(patient.getPhone());
        dto.setDateOfBirth(patient.getDateOfBirth());
        dto.setGender(patient.getGender());
        dto.setConsentGivenAt(patient.getConsentGivenAt());
        
        if (patient.getAddress() != null) {
            dto.setStreet(patient.getAddress().getStreet());
            dto.setCity(patient.getAddress().getCity());
            dto.setState(patient.getAddress().getState());
            dto.setPostalCode(patient.getAddress().getPostalCode());
        }
        return dto;
    }
}
