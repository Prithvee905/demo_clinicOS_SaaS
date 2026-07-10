package com.clinicsaas.event;

import org.springframework.context.ApplicationEvent;
import java.util.UUID;

public class InvoiceCreatedEvent extends ApplicationEvent {
    private final UUID invoiceId;
    private final UUID clinicId;
    private final UUID userId;

    public InvoiceCreatedEvent(Object source, UUID invoiceId, UUID clinicId, UUID userId) {
        super(source);
        this.invoiceId = invoiceId;
        this.clinicId = clinicId;
        this.userId = userId;
    }

    public UUID getInvoiceId() {
        return invoiceId;
    }

    public UUID getClinicId() {
        return clinicId;
    }

    public UUID getUserId() {
        return userId;
    }
}
