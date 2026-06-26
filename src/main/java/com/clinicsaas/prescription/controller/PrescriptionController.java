package com.clinicsaas.prescription.controller;

import com.clinicsaas.prescription.dto.PrescriptionRequestDto;
import com.clinicsaas.prescription.dto.PrescriptionResponseDto;
import com.clinicsaas.prescription.medicine.Medicine;
import com.clinicsaas.prescription.medicine.MedicineCatalogService;
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

    @Autowired
    private MedicineCatalogService medicineCatalogService;

    @PostMapping
    public ResponseEntity<PrescriptionResponseDto> createPrescription(@Valid @RequestBody PrescriptionRequestDto dto) {
        PrescriptionResponseDto response = prescriptionService.createPrescription(dto);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
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

    @GetMapping("/medicines/search")
    public ResponseEntity<List<Medicine>> searchMedicines(@RequestParam("query") String query) {
        List<Medicine> response = medicineCatalogService.search(query);
        return ResponseEntity.ok(response);
    }
}
