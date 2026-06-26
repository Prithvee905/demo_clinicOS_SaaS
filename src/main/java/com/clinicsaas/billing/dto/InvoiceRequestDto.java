package com.clinicsaas.billing.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public class InvoiceRequestDto {

    @NotNull(message = "Patient ID is required")
    private UUID patientId;

    @NotEmpty(message = "Invoice must contain at least one item")
    @Valid
    private List<InvoiceItemDto> items;

    private String paymentMethod; // CASH, UPI, CARD (optional, triggers immediate payment if set)

    public UUID getPatientId() {
        return patientId;
    }

    public void setPatientId(UUID patientId) {
        this.patientId = patientId;
    }

    public List<InvoiceItemDto> getItems() {
        return items;
    }

    public void setItems(List<InvoiceItemDto> items) {
        this.items = items;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }
}
