package com.clinicsaas.prescription.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public class PrescriptionRequestDto {

    @NotNull(message = "Patient ID is required")
    private UUID patientId;

    private String diagnosis;
    private String consultationNotes;

    @NotEmpty(message = "Prescription must contain at least one medicine item")
    @Valid
    private List<PrescriptionItemDto> items;

    public UUID getPatientId() {
        return patientId;
    }

    public void setPatientId(UUID patientId) {
        this.patientId = patientId;
    }

    public String getDiagnosis() {
        return diagnosis;
    }

    public void setDiagnosis(String diagnosis) {
        this.diagnosis = diagnosis;
    }

    public String getConsultationNotes() {
        return consultationNotes;
    }

    public void setConsultationNotes(String consultationNotes) {
        this.consultationNotes = consultationNotes;
    }

    public List<PrescriptionItemDto> getItems() {
        return items;
    }

    public void setItems(List<PrescriptionItemDto> items) {
        this.items = items;
    }
}
