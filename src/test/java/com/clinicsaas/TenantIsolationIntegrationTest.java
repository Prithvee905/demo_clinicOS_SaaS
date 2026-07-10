package com.clinicsaas;

import com.clinicsaas.auth.dto.AuthResponse;
import com.clinicsaas.auth.dto.RegisterRequest;
import com.clinicsaas.patient.dto.PatientRegistrationDto;
import com.clinicsaas.patient.dto.PatientResponseDto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

public class TenantIsolationIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    public void testTenantIsolation_CannotAccessAnotherTenantsPatient() {
        // 1. Register Clinic A
        RegisterRequest registerA = new RegisterRequest();
        registerA.setClinicName("Clinic A");
        registerA.setOwnerName("Owner A");
        registerA.setClinicPhone("111222");
        registerA.setClinicEmail("clinica@clinica.com");
        registerA.setClinicAddress("Clinic A Address");
        registerA.setAdminEmail("admina@clinica.com");
        registerA.setAdminName("Admin A");
        registerA.setAdminPhone("111333");
        registerA.setPassword("password123");

        ResponseEntity<AuthResponse> regResponseA = restTemplate.postForEntity(
                "/api/auth/register", registerA, AuthResponse.class);
        assertEquals(HttpStatus.CREATED, regResponseA.getStatusCode());
        assertNotNull(regResponseA.getBody());
        String tokenA = regResponseA.getBody().getAccessToken();

        // 2. Register Patient under Clinic A
        PatientRegistrationDto patientDto = new PatientRegistrationDto();
        patientDto.setName("John Doe");
        patientDto.setPhone("9876543210");
        patientDto.setGender("Male");
        patientDto.setDateOfBirth(LocalDate.of(2000, 1, 1));
        patientDto.setAddress("A Street, City A");
        patientDto.setBloodGroup("O+");

        HttpHeaders headersA = new HttpHeaders();
        headersA.setBearerAuth(tokenA);
        HttpEntity<PatientRegistrationDto> requestA = new HttpEntity<>(patientDto, headersA);

        ResponseEntity<PatientResponseDto> patientResponseA = restTemplate.postForEntity(
                "/api/patients", requestA, PatientResponseDto.class);
        assertEquals(HttpStatus.CREATED, patientResponseA.getStatusCode());
        assertNotNull(patientResponseA.getBody());
        UUID patientId = patientResponseA.getBody().getId();

        // 3. Register Clinic B
        RegisterRequest registerB = new RegisterRequest();
        registerB.setClinicName("Clinic B");
        registerB.setOwnerName("Owner B");
        registerB.setClinicPhone("222333");
        registerB.setClinicEmail("clinicb@clinicb.com");
        registerB.setClinicAddress("Clinic B Address");
        registerB.setAdminEmail("adminb@clinicb.com");
        registerB.setAdminName("Admin B");
        registerB.setAdminPhone("222444");
        registerB.setPassword("password123");

        ResponseEntity<AuthResponse> regResponseB = restTemplate.postForEntity(
                "/api/auth/register", registerB, AuthResponse.class);
        assertEquals(HttpStatus.CREATED, regResponseB.getStatusCode());
        assertNotNull(regResponseB.getBody());
        String tokenB = regResponseB.getBody().getAccessToken();

        // 4. Try to fetch Clinic A's patient list using Clinic B's token
        HttpHeaders headersB = new HttpHeaders();
        headersB.setBearerAuth(tokenB);
        HttpEntity<Void> requestListB = new HttpEntity<>(headersB);

        ResponseEntity<Map> listResponseB = restTemplate.exchange(
                "/api/patients", HttpMethod.GET, requestListB, Map.class);
        assertEquals(HttpStatus.OK, listResponseB.getStatusCode());
        assertNotNull(listResponseB.getBody());

        // Parse content list from Spring Page response
        java.util.List<?> contentList = (java.util.List<?>) listResponseB.getBody().get("content");
        assertNotNull(contentList);
        assertTrue(contentList.isEmpty(), "Tenant B patient list should be empty");

        // 5. Try to fetch John Doe directly by ID using Clinic B's token
        ResponseEntity<Object> directGetResponseB = restTemplate.exchange(
                "/api/patients/" + patientId, HttpMethod.GET, requestListB, Object.class);
        assertEquals(HttpStatus.NOT_FOUND, directGetResponseB.getStatusCode());
    }
}
