package com.clinicsaas.prescription.service;

import com.clinicsaas.common.exception.CustomException;
import com.clinicsaas.common.tenant.TenantContext;
import com.clinicsaas.auth.domain.Role;
import com.clinicsaas.patient.dto.PatientResponseDto;
import com.clinicsaas.patient.service.PatientService;
import com.clinicsaas.prescription.domain.Prescription;
import com.clinicsaas.prescription.domain.PrescriptionItem;
import com.clinicsaas.prescription.domain.UnmatchedMedicineEntry;
import com.clinicsaas.prescription.dto.PrescriptionItemDto;
import com.clinicsaas.prescription.dto.PrescriptionRequestDto;
import com.clinicsaas.prescription.dto.PrescriptionResponseDto;
import com.clinicsaas.prescription.medicine.MedicineCatalogService;
import com.clinicsaas.prescription.repository.PrescriptionRepository;
import com.clinicsaas.prescription.repository.UnmatchedMedicineRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PrescriptionService {

    @Autowired
    private PrescriptionRepository prescriptionRepository;

    @Autowired
    private UnmatchedMedicineRepository unmatchedMedicineRepository;

    @Autowired
    private MedicineCatalogService medicineCatalogService;

    @Autowired
    private PatientService patientService;

    @Transactional
    public PrescriptionResponseDto createPrescription(PrescriptionRequestDto dto) {
        // Enforce that only Doctors can create prescriptions
        if (!isCurrentUserDoctor()) {
            throw new CustomException("Only doctors are permitted to write prescriptions", HttpStatus.FORBIDDEN);
        }

        // Validate patient exists (cross-module call via service interface)
        PatientResponseDto patient = patientService.getPatientById(dto.getPatientId());

        Prescription prescription = new Prescription();
        prescription.setPatientId(patient.getId());
        prescription.setDoctorUsername(SecurityContextHolder.getContext().getAuthentication().getName());
        prescription.setDiagnosis(dto.getDiagnosis());
        prescription.setConsultationNotes(dto.getConsultationNotes());
        prescription.setCreatedAt(LocalDateTime.now());

        for (PrescriptionItemDto itemDto : dto.getItems()) {
            PrescriptionItem item = new PrescriptionItem();
            item.setMedicineName(itemDto.getMedicineName());
            item.setDosage(itemDto.getDosage());
            item.setFrequency(itemDto.getFrequency());
            item.setDuration(itemDto.getDuration());
            prescription.addItem(item);

            // Verify if medicine is in the catalog. If not, log to unmatched entries
            if (!medicineCatalogService.existsByName(itemDto.getMedicineName())) {
                UnmatchedMedicineEntry unmatched = new UnmatchedMedicineEntry();
                unmatched.setNameEntered(itemDto.getMedicineName());
                unmatched.setCreatedAt(LocalDateTime.now());
                unmatchedMedicineRepository.save(unmatched);
            }
        }

        prescription = prescriptionRepository.save(prescription);
        return mapToDto(prescription, true); // Since creator is doctor, can view fully
    }

    @Transactional(readOnly = true)
    public PrescriptionResponseDto getPrescriptionById(UUID id) {
        Prescription prescription = prescriptionRepository.findById(id)
                .orElseThrow(() -> new CustomException("Prescription not found", HttpStatus.NOT_FOUND));

        boolean canViewNotes = isCurrentUserDoctor();
        return mapToDto(prescription, canViewNotes);
    }

    @Transactional(readOnly = true)
    public List<PrescriptionResponseDto> getPrescriptionsByPatientId(UUID patientId) {
        // Enforce that the patient exists
        patientService.getPatientById(patientId);

        List<Prescription> prescriptions = prescriptionRepository.findByPatientId(patientId);
        boolean canViewNotes = isCurrentUserDoctor();

        return prescriptions.stream()
                .map(p -> mapToDto(p, canViewNotes))
                .collect(Collectors.toList());
    }

    private boolean isCurrentUserDoctor() {
        String roleStr = TenantContext.getCurrentRole();
        boolean isDoctorFlag = TenantContext.isDoctor();
        if (roleStr == null) {
            return false;
        }
        Role role = Role.valueOf(roleStr);
        return role == Role.DOCTOR || isDoctorFlag;
    }

    private PrescriptionResponseDto mapToDto(Prescription p, boolean includeNotes) {
        PrescriptionResponseDto dto = new PrescriptionResponseDto();
        dto.setId(p.getId());
        dto.setPatientId(p.getPatientId());
        dto.setDoctorUsername(p.getDoctorUsername());
        dto.setCreatedAt(p.getCreatedAt());

        if (includeNotes) {
            dto.setDiagnosis(p.getDiagnosis());
            dto.setConsultationNotes(p.getConsultationNotes());
        } else {
            dto.setDiagnosis("[REDACTED - DOCTORS ONLY]");
            dto.setConsultationNotes("[REDACTED - DOCTORS ONLY]");
        }

        List<PrescriptionItemDto> itemDtos = p.getItems().stream()
                .map(item -> new PrescriptionItemDto(
                        item.getMedicineName(),
                        item.getDosage(),
                        item.getFrequency(),
                        item.getDuration()
                ))
                .collect(Collectors.toList());
        dto.setItems(itemDtos);

        return dto;
    }
}
