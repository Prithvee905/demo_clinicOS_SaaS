package com.clinicsaas.prescription.dto;

import jakarta.validation.constraints.NotBlank;

public class PrescriptionItemDto {

    @NotBlank(message = "Medicine name is required")
    private String medicineName;

    private String dosage;
    private String frequency;
    private String duration;

    public PrescriptionItemDto() {}

    public PrescriptionItemDto(String medicineName, String dosage, String frequency, String duration) {
        this.medicineName = medicineName;
        this.dosage = dosage;
        this.frequency = frequency;
        this.duration = duration;
    }

    public String getMedicineName() {
        return medicineName;
    }

    public void setMedicineName(String medicineName) {
        this.medicineName = medicineName;
    }

    public String getDosage() {
        return dosage;
    }

    public void setDosage(String dosage) {
        this.dosage = dosage;
    }

    public String getFrequency() {
        return frequency;
    }

    public void setFrequency(String frequency) {
        this.frequency = frequency;
    }

    public String getDuration() {
        return duration;
    }

    public void setDuration(String duration) {
        this.duration = duration;
    }
}
