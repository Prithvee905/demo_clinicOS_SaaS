package com.clinicsaas;

import com.clinicsaas.auth.dto.AuthResponse;
import com.clinicsaas.auth.dto.LoginRequest;
import com.clinicsaas.auth.dto.RegisterRequest;
import com.clinicsaas.patient.dto.PatientRegistrationDto;
import com.clinicsaas.patient.dto.PatientResponseDto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import java.util.List;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

public class TenantIsolationIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    public void testTenantIsolation_CannotAccessAnotherTenantsPatient() {
        // 1. Register Clinic A
        RegisterRequest registerA = new RegisterRequest();
        registerA.setUsername("admin_clinic_a");
        registerA.setPassword("password123");
        registerA.setEmail("admina@clinica.com");
        registerA.setFullName("Admin A");
        registerA.setClinicName("Clinic A");

        ResponseEntity<AuthResponse> regResponseA = restTemplate.postForEntity(
                "/api/auth/register", registerA, AuthResponse.class);
        assertEquals(HttpStatus.CREATED, regResponseA.getStatusCode());
        assertNotNull(regResponseA.getBody());
        String tokenA = regResponseA.getBody().getToken();
        String tenantIdA = regResponseA.getBody().getTenantId();

        // 2. Register Patient under Clinic A
        PatientRegistrationDto patientDto = new PatientRegistrationDto();
        patientDto.setName("John Doe");
        patientDto.setEmail("johndoe@gmail.com");
        patientDto.setPhone("9876543210");
        patientDto.setConsentGiven(true);
        patientDto.setStreet("A Street");
        patientDto.setCity("City A");
        patientDto.setState("State A");
        patientDto.setPostalCode("123456");

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
        registerB.setUsername("admin_clinic_b");
        registerB.setPassword("password123");
        registerB.setEmail("adminb@clinicb.com");
        registerB.setFullName("Admin B");
        registerB.setClinicName("Clinic B");

        ResponseEntity<AuthResponse> regResponseB = restTemplate.postForEntity(
                "/api/auth/register", registerB, AuthResponse.class);
        assertEquals(HttpStatus.CREATED, regResponseB.getStatusCode());
        assertNotNull(regResponseB.getBody());
        String tokenB = regResponseB.getBody().getToken();
        String tenantIdB = regResponseB.getBody().getTenantId();

        // 4. Try to fetch Clinic A's patient list using Clinic B's JWT token
        HttpHeaders headersB = new HttpHeaders();
        headersB.setBearerAuth(tokenB);
        HttpEntity<Void> requestListB = new HttpEntity<>(headersB);

        ResponseEntity<List> listResponseB = restTemplate.exchange(
                "/api/patients", HttpMethod.GET, requestListB, List.class);
        assertEquals(HttpStatus.OK, listResponseB.getStatusCode());
        assertNotNull(listResponseB.getBody());
        // Assert that John Doe (created in Tenant A) is NOT visible to Tenant B
        assertTrue(listResponseB.getBody().isEmpty(), "Tenant B patient list should be empty");

        // 5. Try to fetch John Doe directly by ID using Clinic B's JWT token
        ResponseEntity<Object> directGetResponseB = restTemplate.exchange(
                "/api/patients/" + patientId, HttpMethod.GET, requestListB, Object.class);
        // Assert that it returns NOT_FOUND (404) because RLS filters the row, making it look non-existent to Tenant B
        assertEquals(HttpStatus.NOT_FOUND, directGetResponseB.getStatusCode());
    }
}
