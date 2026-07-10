package com.clinicsaas.prescription.medicine;

import com.clinicsaas.common.audit.AuditLogService;
import com.clinicsaas.common.exception.CustomException;
import com.clinicsaas.common.tenant.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
public class MedicineCatalogService {

    private static final Logger log = LoggerFactory.getLogger(MedicineCatalogService.class);

    @Autowired
    private MedicineRepository medicineRepository;

    @Autowired
    private AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<Medicine> search(String query) {
        UUID clinicId = getClinicIdFromContext();
        log.info("Searching medicines for query '{}' in clinic {}", query, clinicId);
        return medicineRepository.searchMedicines(clinicId, query);
    }

    @Transactional(readOnly = true)
    public Page<Medicine> searchPaged(String search, Pageable pageable) {
        UUID clinicId = getClinicIdFromContext();
        return medicineRepository.searchMedicinesPaged(clinicId, search, pageable);
    }

    @Transactional
    public Medicine createMedicine(Medicine medicine) {
        UUID clinicId = getClinicIdFromContext();

        if (medicineRepository.existsByClinicIdAndMedicineCodeAndStatus(clinicId, medicine.getMedicineCode(), "ACTIVE")) {
            throw new CustomException("Medicine with this code already exists in this clinic", HttpStatus.BAD_REQUEST, "DUPLICATE_MEDICINE_CODE");
        }

        medicine.setClinicId(clinicId);
        medicine.setStatus("ACTIVE");
        Medicine saved = medicineRepository.save(medicine);

        // Audit
        auditLogService.logAction("MEDICINE_CREATED", "MEDICINE", saved.getId(), 
                "Created medicine catalog entry " + saved.getMedicineName() + " with code " + saved.getMedicineCode());

        return saved;
    }

    @Transactional
    public Medicine updateMedicine(UUID id, Medicine dto) {
        UUID clinicId = getClinicIdFromContext();

        Medicine medicine = medicineRepository.findByIdAndClinicIdAndStatus(id, clinicId, "ACTIVE")
                .orElseThrow(() -> new CustomException("Medicine not found", HttpStatus.NOT_FOUND, "MEDICINE_NOT_FOUND"));

        if (!medicine.getMedicineCode().equals(dto.getMedicineCode()) && 
            medicineRepository.existsByClinicIdAndMedicineCodeAndStatus(clinicId, dto.getMedicineCode(), "ACTIVE")) {
            throw new CustomException("Medicine with this code already exists in this clinic", HttpStatus.BAD_REQUEST, "DUPLICATE_MEDICINE_CODE");
        }

        medicine.setMedicineCode(dto.getMedicineCode());
        medicine.setMedicineName(dto.getMedicineName());
        medicine.setUnitPrice(dto.getUnitPrice());
        medicine.setGstPercentage(dto.getGstPercentage());
        medicine.setUnitType(dto.getUnitType());

        Medicine saved = medicineRepository.save(medicine);

        // Audit
        auditLogService.logAction("MEDICINE_UPDATED", "MEDICINE", saved.getId(), 
                "Updated medicine price/details for code " + saved.getMedicineCode());

        return saved;
    }

    @Transactional(readOnly = true)
    public Medicine getMedicineById(UUID id) {
        UUID clinicId = getClinicIdFromContext();
        return medicineRepository.findByIdAndClinicIdAndStatus(id, clinicId, "ACTIVE")
                .orElseThrow(() -> new CustomException("Medicine not found", HttpStatus.NOT_FOUND, "MEDICINE_NOT_FOUND"));
    }

    @Transactional
    public void deleteMedicine(UUID id) {
        UUID clinicId = getClinicIdFromContext();
        Medicine medicine = medicineRepository.findByIdAndClinicIdAndStatus(id, clinicId, "ACTIVE")
                .orElseThrow(() -> new CustomException("Medicine not found", HttpStatus.NOT_FOUND, "MEDICINE_NOT_FOUND"));

        medicine.setStatus("INACTIVE");
        medicineRepository.save(medicine);

        // Audit
        auditLogService.logAction("MEDICINE_DELETED", "MEDICINE", medicine.getId(), 
                "Soft-deleted medicine " + medicine.getMedicineName() + " with code " + medicine.getMedicineCode());
    }

    @Transactional(readOnly = true)
    public boolean existsByName(String name) {
        UUID clinicId = getClinicIdFromContext();
        return medicineRepository.existsByClinicIdAndMedicineNameIgnoreCaseAndStatus(clinicId, name, "ACTIVE");
    }

    private UUID getClinicIdFromContext() {
        String clinicIdStr = TenantContext.getTenantId();
        if (clinicIdStr == null) {
            throw new CustomException("No active clinic context found", HttpStatus.BAD_REQUEST, "NO_CLINIC_CONTEXT");
        }
        return UUID.fromString(clinicIdStr);
    }
}
