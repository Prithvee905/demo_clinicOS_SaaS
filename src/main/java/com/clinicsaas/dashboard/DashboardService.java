package com.clinicsaas.dashboard;

import com.clinicsaas.billing.repository.InvoiceRepository;
import com.clinicsaas.common.exception.CustomException;
import com.clinicsaas.common.tenant.TenantContext;
import com.clinicsaas.dashboard.dto.DashboardMetricsDto;
import com.clinicsaas.doctor.repository.DoctorRepository;
import com.clinicsaas.patient.repository.PatientRepository;
import com.clinicsaas.prescription.repository.PrescriptionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service
public class DashboardService {

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private PrescriptionRepository prescriptionRepository;

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Transactional(readOnly = true)
    public DashboardMetricsDto getMetrics() {
        String clinicIdStr = TenantContext.getTenantId();
        if (clinicIdStr == null) {
            throw new CustomException("No active clinic context found", HttpStatus.BAD_REQUEST, "NO_CLINIC_CONTEXT");
        }

        UUID clinicId = UUID.fromString(clinicIdStr);

        long totalPatients = patientRepository.countByClinicId(clinicId);
        long totalDoctors = doctorRepository.countByClinicIdAndStatus(clinicId, "ACTIVE");
        
        long activePrescriptions = prescriptionRepository.countByClinicIdAndStatus(clinicId, "DRAFT") +
                                  prescriptionRepository.countByClinicIdAndStatus(clinicId, "COMPLETED");

        long invoicesGenerated = invoiceRepository.countByClinicIdAndStatus(clinicId, "GENERATED");
        long invoicesSent = invoiceRepository.countByClinicIdAndStatus(clinicId, "SENT");

        return new DashboardMetricsDto(totalPatients, totalDoctors, activePrescriptions, invoicesGenerated, invoicesSent);
    }
}
