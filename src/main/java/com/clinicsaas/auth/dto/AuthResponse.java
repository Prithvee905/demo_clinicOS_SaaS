package com.clinicsaas.auth.dto;

public class AuthResponse {

    private String token;
    private String username;
    private String tenantId;
    private String clinicCode;
    private String role;
    private boolean isDoctor;

    public AuthResponse() {}

    public AuthResponse(String token, String username, String tenantId, String clinicCode, String role, boolean isDoctor) {
        this.token = token;
        this.username = username;
        this.tenantId = tenantId;
        this.clinicCode = clinicCode;
        this.role = role;
        this.isDoctor = isDoctor;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getTenantId() {
        return tenantId;
    }

    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    public String getClinicCode() {
        return clinicCode;
    }

    public void setClinicCode(String clinicCode) {
        this.clinicCode = clinicCode;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public boolean isDoctor() {
        return isDoctor;
    }

    public void setDoctor(boolean doctor) {
        isDoctor = doctor;
    }
}
