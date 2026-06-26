package com.clinicsaas.common.audit;

import com.clinicsaas.patient.dto.PatientResponseDto;
import com.clinicsaas.prescription.dto.PrescriptionResponseDto;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.UUID;

@Aspect
@Component
public class PatientAuditAspect {

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Pointcut("execution(* com.clinicsaas.patient.service.PatientService.registerPatient(..)) || " +
              "execution(* com.clinicsaas.patient.service.PatientService.getPatientById(..)) || " +
              "execution(* com.clinicsaas.patient.service.PatientService.getAllPatients(..))")
    public void patientServiceMethods() {}

    @Pointcut("execution(* com.clinicsaas.prescription.service.PrescriptionService.createPrescription(..)) || " +
              "execution(* com.clinicsaas.prescription.service.PrescriptionService.getPrescriptionById(..)) || " +
              "execution(* com.clinicsaas.prescription.service.PrescriptionService.getPrescriptionsByPatientId(..))")
    public void prescriptionServiceMethods() {}

    @AfterReturning(pointcut = "patientServiceMethods() || prescriptionServiceMethods()", returning = "result")
    public void auditPatientDataAccess(JoinPoint joinPoint, Object result) {
        String methodName = joinPoint.getSignature().getName();
        String username = getUsername();
        if (username == null || "anonymousUser".equals(username)) {
            return; // Skip auditing if no authenticated user
        }

        if (result instanceof PatientResponseDto patientDto) {
            logAudit(username, getActionName(methodName), patientDto.getId(), "Accessed patient details for: " + patientDto.getName());
        } else if (result instanceof PrescriptionResponseDto prescriptionDto) {
            logAudit(username, getActionName(methodName), prescriptionDto.getPatientId(), "Accessed prescription with ID: " + prescriptionDto.getId());
        } else if (result instanceof Collection<?> list) {
            for (Object item : list) {
                if (item instanceof PatientResponseDto patientDto) {
                    logAudit(username, getActionName(methodName), patientDto.getId(), "Bulk list accessed patient: " + patientDto.getName());
                } else if (item instanceof PrescriptionResponseDto prescriptionDto) {
                    logAudit(username, getActionName(methodName), prescriptionDto.getPatientId(), "Bulk list accessed prescription: " + prescriptionDto.getId());
                }
            }
        }
    }

    private void logAudit(String username, String action, UUID patientId, String details) {
        AuditLog auditLog = new AuditLog();
        auditLog.setUsername(username);
        auditLog.setAction(action);
        auditLog.setPatientId(patientId);
        auditLog.setDetails(details);
        auditLog.setTimestamp(LocalDateTime.now());
        auditLogRepository.save(auditLog);
    }

    private String getUsername() {
        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            return SecurityContextHolder.getContext().getAuthentication().getName();
        }
        return null;
    }

    private String getActionName(String methodName) {
        if (methodName.startsWith("register") || methodName.startsWith("create")) {
            return "WRITE_PATIENT_DATA";
        }
        if (methodName.startsWith("get") || methodName.startsWith("find")) {
            return "READ_PATIENT_DATA";
        }
        return "ACCESS_PATIENT_DATA";
    }
}
