package com.clinicsaas.patient.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

public class PatientRegistrationDto {

    @NotBlank(message = "Patient name is required")
    private String name;

    @NotBlank(message = "Patient phone is required")
    private String phone;

    @NotBlank(message = "Gender is required")
    private String gender;

    private LocalDate dateOfBirth;

    private String address;

    private String bloodGroup;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public LocalDate getDateOfBirth() {
        return dateOfBirth;
    }

    public void setDateOfBirth(LocalDate dateOfBirth) {
        this.dateOfBirth = dateOfBirth;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getBloodGroup() {
        return bloodGroup;
    }

    public void setBloodGroup(String bloodGroup) {
        this.bloodGroup = bloodGroup;
    }
}
