package com.clinicsaas.common.audit;

import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import java.util.UUID;

@Aspect
@Component
public class PatientAuditAspect {

    private static final Logger log = LoggerFactory.getLogger(PatientAuditAspect.class);

    @Autowired
    private AuditLogService auditLogService;

    // Pointcut targeting all methods inside patient and prescription services
    @Pointcut("execution(* com.clinicsaas.patient.service.PatientService.*(..)) || " +
              "execution(* com.clinicsaas.prescription.service.PrescriptionService.*(..))")
    public void serviceLayerMethods() {}

    @AfterReturning(pointcut = "serviceLayerMethods()", returning = "result")
    public void auditServiceCall(JoinPoint joinPoint, Object result) {
        String methodName = joinPoint.getSignature().getName();
        
        try {
            if ("createPatient".equals(methodName)) {
                UUID id = getEntityId(result);
                auditLogService.logAction("PATIENT_CREATED", "PATIENT", id, "Registered new patient record.");
            } else if ("updatePatient".equals(methodName)) {
                UUID id = getEntityId(result);
                auditLogService.logAction("PATIENT_UPDATED", "PATIENT", id, "Updated patient demographic records.");
            } else if ("deletePatient".equals(methodName)) {
                UUID id = getArgumentId(joinPoint.getArgs());
                auditLogService.logAction("PATIENT_DELETED", "PATIENT", id, "Soft-deleted patient record.");
            } else if ("getPatientById".equals(methodName)) {
                UUID id = getEntityId(result);
                auditLogService.logAction("PATIENT_RECORD_VIEWED", "PATIENT", id, "Viewed patient medical details.");
            } else if ("getAllPatients".equals(methodName) || "searchPatients".equals(methodName)) {
                auditLogService.logAction("PATIENT_LIST_VIEWED", "PATIENT", null, "Viewed/searched patient registry list.");
            } else if ("createPrescription".equals(methodName)) {
                UUID id = getEntityId(result);
                auditLogService.logAction("PRESCRIPTION_CREATED", "PRESCRIPTION", id, "Created new prescription draft.");
            } else if ("updatePrescription".equals(methodName)) {
                UUID id = getEntityId(result);
                auditLogService.logAction("PRESCRIPTION_UPDATED", "PRESCRIPTION", id, "Modified prescription items/notes.");
            } else if ("completePrescription".equals(methodName)) {
                UUID id = getEntityId(result);
                auditLogService.logAction("PRESCRIPTION_COMPLETED", "PRESCRIPTION", id, "Completed and locked prescription details.");
            } else if ("getPrescriptionById".equals(methodName)) {
                UUID id = getEntityId(result);
                auditLogService.logAction("PRESCRIPTION_VIEWED", "PRESCRIPTION", id, "Viewed patient clinical prescription.");
            }
        } catch (Exception e) {
            log.error("Failed to automatically audit method: " + methodName, e);
        }
    }

    private UUID getEntityId(Object result) {
        if (result == null) return null;
        try {
            return (UUID) result.getClass().getMethod("getId").invoke(result);
        } catch (Exception e) {
            return null;
        }
    }

    private UUID getArgumentId(Object[] args) {
        if (args == null || args.length == 0) return null;
        for (Object arg : args) {
            if (arg instanceof UUID) {
                return (UUID) arg;
            }
        }
        return null;
    }
}
