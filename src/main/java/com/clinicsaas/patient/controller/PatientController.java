package com.clinicsaas.patient.controller;

import com.clinicsaas.patient.dto.PatientRegistrationDto;
import com.clinicsaas.patient.dto.PatientResponseDto;
import com.clinicsaas.patient.service.PatientService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/patients")
public class PatientController {

    @Autowired
    private PatientService patientService;

    @PostMapping
    public ResponseEntity<PatientResponseDto> registerPatient(@Valid @RequestBody PatientRegistrationDto dto) {
        PatientResponseDto response = patientService.registerPatient(dto);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PatientResponseDto> getPatientById(@PathVariable UUID id) {
        PatientResponseDto response = patientService.getPatientById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<PatientResponseDto>> getAllPatients() {
        List<PatientResponseDto> response = patientService.getAllPatients();
        return ResponseEntity.ok(response);
    }
}
