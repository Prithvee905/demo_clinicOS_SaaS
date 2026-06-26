package com.clinicsaas.common.tenant;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import java.util.UUID;

@MappedSuperclass
public abstract class BaseTenantEntity {

    @Column(name = "tenant_id", nullable = false, updatable = false)
    private UUID tenantId;

    public UUID getTenantId() {
        return tenantId;
    }

    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }

    @PrePersist
    public void prePersistTenant() {
        if (this.tenantId == null) {
            String tenantStr = TenantContext.getTenantId();
            if (tenantStr != null) {
                this.tenantId = UUID.fromString(tenantStr);
            }
        }
    }
}
