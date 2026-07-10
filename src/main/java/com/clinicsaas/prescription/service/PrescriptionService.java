package com.clinicsaas.prescription.service;

import com.clinicsaas.auth.domain.Role;
import com.clinicsaas.auth.domain.User;
import com.clinicsaas.auth.repository.UserRepository;
import com.clinicsaas.common.audit.AuditLogService;
import com.clinicsaas.common.exception.CustomException;
import com.clinicsaas.common.tenant.TenantContext;
import com.clinicsaas.doctor.domain.Doctor;
import com.clinicsaas.doctor.repository.DoctorRepository;
import com.clinicsaas.patient.domain.Patient;
import com.clinicsaas.patient.repository.PatientRepository;
import com.clinicsaas.prescription.domain.Prescription;
import com.clinicsaas.prescription.domain.PrescriptionItem;
import com.clinicsaas.prescription.dto.PrescriptionItemDto;
import com.clinicsaas.prescription.dto.PrescriptionRequestDto;
import com.clinicsaas.prescription.dto.PrescriptionResponseDto;
import com.clinicsaas.prescription.medicine.Medicine;
import com.clinicsaas.prescription.medicine.MedicineRepository;
import com.clinicsaas.prescription.repository.PrescriptionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PrescriptionService {

    @Autowired
    private PrescriptionRepository prescriptionRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private MedicineRepository medicineRepository;

    @Autowired
    private UserRepository userRepository;


    @Transactional
    public PrescriptionResponseDto createPrescription(PrescriptionRequestDto dto) {
        UUID clinicId = getClinicIdFromContext();

        // Enforce role check
        if (!isCurrentUserDoctor()) {
            throw new CustomException("Only doctors are permitted to write prescriptions", HttpStatus.FORBIDDEN, "FORBIDDEN_ROLE");
        }

        // Validate Patient exists and is active
        Patient patient = patientRepository.findByIdAndClinicIdAndStatus(dto.getPatientId(), clinicId, "ACTIVE")
                .orElseThrow(() -> new CustomException("Patient not found", HttpStatus.BAD_REQUEST, "PATIENT_NOT_FOUND"));

        // Validate Doctor exists and is active
        Doctor doctor = doctorRepository.findByIdAndClinicIdAndStatus(dto.getDoctorId(), clinicId, "ACTIVE")
                .orElseThrow(() -> new CustomException("Doctor not found", HttpStatus.BAD_REQUEST, "DOCTOR_NOT_FOUND"));

        Prescription prescription = new Prescription();
        prescription.setClinicId(clinicId);
        prescription.setPatient(patient);
        prescription.setDoctor(doctor);
        prescription.setConsultationFee(dto.getConsultationFee());
        prescription.setDoctorNotes(dto.getDoctorNotes());
        prescription.setPrescriptionDate(LocalDateTime.now());
        prescription.setStatus("DRAFT");

        for (PrescriptionItemDto itemDto : dto.getItems()) {
            Medicine medicine = medicineRepository.findByIdAndClinicIdAndStatus(itemDto.getMedicineId(), clinicId, "ACTIVE")
                    .orElseThrow(() -> new CustomException("Medicine not found with ID: " + itemDto.getMedicineId(), HttpStatus.BAD_REQUEST, "MEDICINE_NOT_FOUND"));

            PrescriptionItem item = new PrescriptionItem();
            item.setMedicine(medicine);
            item.setQuantity(itemDto.getQuantity());
            item.setDosage(itemDto.getDosage());
            item.setFrequency(itemDto.getFrequency());
            item.setDuration(itemDto.getDuration());
            item.setRemarks(itemDto.getRemarks());
            prescription.addItem(item);
        }

        prescription = prescriptionRepository.save(prescription);


        return mapToDto(prescription, true);
    }

    @Transactional
    public PrescriptionResponseDto updatePrescription(UUID id, PrescriptionRequestDto dto) {
        UUID clinicId = getClinicIdFromContext();

        // Enforce role check
        if (!isCurrentUserDoctor()) {
            throw new CustomException("Only doctors are permitted to modify prescriptions", HttpStatus.FORBIDDEN, "FORBIDDEN_ROLE");
        }

        Prescription prescription = prescriptionRepository.findByIdAndClinicId(id, clinicId)
                .orElseThrow(() -> new CustomException("Prescription not found", HttpStatus.NOT_FOUND, "PRESCRIPTION_NOT_FOUND"));

        if (!"DRAFT".equals(prescription.getStatus())) {
            throw new CustomException("Only prescriptions in DRAFT status can be modified", HttpStatus.BAD_REQUEST, "PRESCRIPTION_NOT_DRAFT");
        }

        // Validate Patient
        Patient patient = patientRepository.findByIdAndClinicIdAndStatus(dto.getPatientId(), clinicId, "ACTIVE")
                .orElseThrow(() -> new CustomException("Patient not found", HttpStatus.BAD_REQUEST, "PATIENT_NOT_FOUND"));

        // Validate Doctor
        Doctor doctor = doctorRepository.findByIdAndClinicIdAndStatus(dto.getDoctorId(), clinicId, "ACTIVE")
                .orElseThrow(() -> new CustomException("Doctor not found", HttpStatus.BAD_REQUEST, "DOCTOR_NOT_FOUND"));

        prescription.setPatient(patient);
        prescription.setDoctor(doctor);
        prescription.setConsultationFee(dto.getConsultationFee());
        prescription.setDoctorNotes(dto.getDoctorNotes());

        // Rebuild items
        prescription.getItems().clear();
        for (PrescriptionItemDto itemDto : dto.getItems()) {
            Medicine medicine = medicineRepository.findByIdAndClinicIdAndStatus(itemDto.getMedicineId(), clinicId, "ACTIVE")
                    .orElseThrow(() -> new CustomException("Medicine not found with ID: " + itemDto.getMedicineId(), HttpStatus.BAD_REQUEST, "MEDICINE_NOT_FOUND"));

            PrescriptionItem item = new PrescriptionItem();
            item.setMedicine(medicine);
            item.setQuantity(itemDto.getQuantity());
            item.setDosage(itemDto.getDosage());
            item.setFrequency(itemDto.getFrequency());
            item.setDuration(itemDto.getDuration());
            item.setRemarks(itemDto.getRemarks());
            prescription.addItem(item);
        }

        prescription = prescriptionRepository.save(prescription);


        return mapToDto(prescription, true);
    }

    @Transactional
    public PrescriptionResponseDto completePrescription(UUID id) {
        UUID clinicId = getClinicIdFromContext();

        // Enforce role check
        if (!isCurrentUserDoctor()) {
            throw new CustomException("Only doctors are permitted to complete prescriptions", HttpStatus.FORBIDDEN, "FORBIDDEN_ROLE");
        }

        Prescription prescription = prescriptionRepository.findByIdAndClinicId(id, clinicId)
                .orElseThrow(() -> new CustomException("Prescription not found", HttpStatus.NOT_FOUND, "PRESCRIPTION_NOT_FOUND"));

        if (!"DRAFT".equals(prescription.getStatus())) {
            throw new CustomException("Only draft prescriptions can be completed", HttpStatus.BAD_REQUEST, "PRESCRIPTION_NOT_DRAFT");
        }

        // Take price and GST snapshots for all items from the current medicine catalog values
        for (PrescriptionItem item : prescription.getItems()) {
            Medicine catalogMedicine = item.getMedicine();
            item.setUnitPriceSnapshot(catalogMedicine.getUnitPrice());
            item.setGstPercentageSnapshot(catalogMedicine.getGstPercentage());
        }

        prescription.setStatus("COMPLETED");
        prescription = prescriptionRepository.save(prescription);


        return mapToDto(prescription, true);
    }

    @Transactional(readOnly = true)
    public PrescriptionResponseDto getPrescriptionById(UUID id) {
        UUID clinicId = getClinicIdFromContext();
        Prescription prescription = prescriptionRepository.findByIdAndClinicId(id, clinicId)
                .orElseThrow(() -> new CustomException("Prescription not found", HttpStatus.NOT_FOUND, "PRESCRIPTION_NOT_FOUND"));

        boolean canViewNotes = isCurrentUserDoctor();
        return mapToDto(prescription, canViewNotes);
    }

    @Transactional(readOnly = true)
    public List<PrescriptionResponseDto> getPrescriptionsByPatientId(UUID patientId) {
        UUID clinicId = getClinicIdFromContext();
        
        // Enforce patient exists
        patientRepository.findByIdAndClinicIdAndStatus(patientId, clinicId, "ACTIVE")
                .orElseThrow(() -> new CustomException("Patient not found", HttpStatus.NOT_FOUND, "PATIENT_NOT_FOUND"));

        List<Prescription> prescriptions = prescriptionRepository.findByPatientIdAndClinicId(patientId, clinicId);
        boolean canViewNotes = isCurrentUserDoctor();

        return prescriptions.stream()
                .map(p -> mapToDto(p, canViewNotes))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PrescriptionResponseDto> getAllPrescriptions() {
        UUID clinicId = getClinicIdFromContext();
        List<Prescription> prescriptions = prescriptionRepository.findByClinicId(clinicId);
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

    private UUID getClinicIdFromContext() {
        String clinicIdStr = TenantContext.getTenantId();
        if (clinicIdStr == null) {
            throw new CustomException("No active clinic context found", HttpStatus.BAD_REQUEST, "NO_CLINIC_CONTEXT");
        }
        return UUID.fromString(clinicIdStr);
    }

    private PrescriptionResponseDto mapToDto(Prescription p, boolean includeNotes) {
        PrescriptionResponseDto dto = new PrescriptionResponseDto();
        dto.setId(p.getId());
        dto.setClinicId(p.getClinicId());
        dto.setPatientId(p.getPatient().getId());
        dto.setPatientName(p.getPatient().getName());
        dto.setPatientPhone(p.getPatient().getPhone());
        dto.setDoctorId(p.getDoctor().getId());
        dto.setDoctorName(p.getDoctor().getName());
        dto.setConsultationFee(p.getConsultationFee());
        dto.setPrescriptionDate(p.getPrescriptionDate());
        dto.setStatus(p.getStatus());
        dto.setVersion(p.getVersion());

        if (includeNotes) {
            dto.setDoctorNotes(p.getDoctorNotes());
        } else {
            dto.setDoctorNotes("[REDACTED - DOCTORS ONLY]");
        }

        List<PrescriptionItemDto> itemDtos = p.getItems().stream()
                .map(item -> {
                    PrescriptionItemDto itemDto = new PrescriptionItemDto();
                    itemDto.setMedicineId(item.getMedicine().getId());
                    itemDto.setMedicineName(item.getMedicine().getMedicineName());
                    itemDto.setQuantity(item.getQuantity());
                    itemDto.setDosage(item.getDosage());
                    itemDto.setFrequency(item.getFrequency());
                    itemDto.setDuration(item.getDuration());
                    itemDto.setRemarks(item.getRemarks());
                    itemDto.setUnitPriceSnapshot(item.getUnitPriceSnapshot());
                    itemDto.setGstPercentageSnapshot(item.getGstPercentageSnapshot());
                    return itemDto;
                })
                .collect(Collectors.toList());
        dto.setItems(itemDtos);

        return dto;
    }
}
