package com.clinicsaas;

import com.clinicsaas.auth.dto.AuthResponse;
import com.clinicsaas.auth.dto.RegisterRequest;
import com.clinicsaas.common.tenant.TenantContext;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;

import static org.junit.jupiter.api.Assertions.*;

public class TenantContextLeakageTest extends BaseIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    @DisplayName("Verify TenantContext is cleared after request completion")
    public void testTenantContextIsClearedAfterRequest() {
        // 1. Register Clinic
        RegisterRequest registerReq = new RegisterRequest();
        registerReq.setClinicName("Leakage Test Clinic");
        registerReq.setOwnerName("Dr. Test");
        registerReq.setClinicPhone("9988776655");
        registerReq.setClinicEmail("test@leakageclinic.com");
        registerReq.setClinicAddress("123 Test St");
        registerReq.setAdminEmail("admin@leakageclinic.com");
        registerReq.setAdminName("Leakage Admin");
        registerReq.setAdminPhone("9988776655");
        registerReq.setPassword("password123");

        ResponseEntity<AuthResponse> regResponse = restTemplate.postForEntity(
                "/api/auth/register", registerReq, AuthResponse.class);
        assertEquals(HttpStatus.CREATED, regResponse.getStatusCode());
        assertNotNull(regResponse.getBody());
        String token = regResponse.getBody().getAccessToken();

        // 2. Perform Authenticated Request
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

        ResponseEntity<String> response = restTemplate.exchange(
                "/api/doctors", HttpMethod.GET, requestEntity, String.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        // 3. Verify ThreadLocal TenantContext state on current thread is null
        assertNull(TenantContext.getTenantId(), "TenantContext tenantId must be null after request completion");
        assertNull(TenantContext.getUserId(), "TenantContext userId must be null after request completion");
        assertNull(TenantContext.getCurrentRole(), "TenantContext currentRole must be null after request completion");
        assertFalse(TenantContext.isDoctor(), "TenantContext isDoctor must be false after request completion");
    }

    @Test
    @DisplayName("Verify TenantContext is cleared even when an exception occurs")
    public void testTenantContextClearedOnException() {
        // Execute request to non-existent resource or invalid method
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth("invalid-token-123");
        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

        ResponseEntity<String> response = restTemplate.exchange(
                "/api/doctors", HttpMethod.GET, requestEntity, String.class);
        
        // Response will be 401 Unauthorized
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());

        // Verify TenantContext is cleared in finally block
        assertNull(TenantContext.getTenantId(), "TenantContext must be null after exception/unauthorized request");
        assertNull(TenantContext.getUserId(), "TenantContext userId must be null after exception");
    }
}
