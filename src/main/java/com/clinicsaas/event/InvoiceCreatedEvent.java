package com.clinicsaas.event;

import java.util.UUID;

public class InvoiceCreatedEvent {
    private final UUID invoiceId;
    private final UUID tenantId;

    public InvoiceCreatedEvent(UUID invoiceId, UUID tenantId) {
        this.invoiceId = invoiceId;
        this.tenantId = tenantId;
    }

    public UUID getInvoiceId() {
        return invoiceId;
    }

    public UUID getTenantId() {
        return tenantId;
    }
}
