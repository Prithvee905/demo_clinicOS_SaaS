package com.clinicsaas.prescription.controller;

import com.clinicsaas.prescription.dto.PrescriptionRequestDto;
import com.clinicsaas.prescription.dto.PrescriptionResponseDto;
import com.clinicsaas.prescription.service.PrescriptionService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/prescriptions")
public class PrescriptionController {

    @Autowired
    private PrescriptionService prescriptionService;

    @PostMapping
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<PrescriptionResponseDto> createPrescription(@Valid @RequestBody PrescriptionRequestDto dto) {
        PrescriptionResponseDto response = prescriptionService.createPrescription(dto);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<PrescriptionResponseDto> updatePrescription(@PathVariable UUID id, @Valid @RequestBody PrescriptionRequestDto dto) {
        PrescriptionResponseDto response = prescriptionService.updatePrescription(id, dto);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/complete")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<PrescriptionResponseDto> completePrescription(@PathVariable UUID id) {
        PrescriptionResponseDto response = prescriptionService.completePrescription(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PrescriptionResponseDto> getPrescriptionById(@PathVariable UUID id) {
        PrescriptionResponseDto response = prescriptionService.getPrescriptionById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<PrescriptionResponseDto>> getPrescriptionsByPatientId(@PathVariable UUID patientId) {
        List<PrescriptionResponseDto> response = prescriptionService.getPrescriptionsByPatientId(patientId);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<PrescriptionResponseDto>> getAllPrescriptions() {
        List<PrescriptionResponseDto> response = prescriptionService.getAllPrescriptions();
        return ResponseEntity.ok(response);
    }
}
