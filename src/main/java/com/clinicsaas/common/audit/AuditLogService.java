package com.clinicsaas.common.audit;

import com.clinicsaas.common.tenant.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service
public class AuditLogService {

    private static final Logger log = LoggerFactory.getLogger(AuditLogService.class);

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logAction(String action, String entityType, UUID entityId, String metadata) {
        String userIdStr = TenantContext.getUserId();
        String clinicIdStr = TenantContext.getTenantId();

        if (userIdStr == null || clinicIdStr == null) {
            log.warn("Cannot auto-audit action '{}' on entity '{}': No tenant context user/clinic found.", action, entityType);
            return;
        }

        logAction(UUID.fromString(userIdStr), UUID.fromString(clinicIdStr), action, entityType, entityId, metadata);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logAction(UUID userId, UUID clinicId, String action, String entityType, UUID entityId, String metadata) {
        try {
            AuditLog auditLog = new AuditLog();
            auditLog.setClinicId(clinicId);
            auditLog.setUserId(userId);
            auditLog.setAction(action);
            auditLog.setEntityType(entityType);
            auditLog.setEntityId(entityId);
            auditLog.setMetadata(metadata);
            
            // Set temporary context in case of RLS or base tenant entity checks
            TenantContext.setTenantId(clinicId.toString());
            
            auditLogRepository.save(auditLog);
            log.info("Audit log written: user={}, action={}, entityType={}, entityId={}", userId, action, entityType, entityId);
        } catch (Exception e) {
            log.error("Failed to write audit log for action: " + action, e);
        }
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> getRecentLogs(Pageable pageable) {
        String clinicIdStr = TenantContext.getTenantId();
        if (clinicIdStr == null) {
            return Page.empty();
        }
        return auditLogRepository.findByClinicIdOrderByCreatedAtDesc(UUID.fromString(clinicIdStr), pageable);
    }
}
