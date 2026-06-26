package com.clinicsaas;

import com.clinicsaas.auth.dto.AuthResponse;
import com.clinicsaas.auth.dto.RegisterRequest;
import com.clinicsaas.billing.dto.InvoiceItemDto;
import com.clinicsaas.billing.dto.InvoiceRequestDto;
import com.clinicsaas.billing.dto.InvoiceResponseDto;
import com.clinicsaas.patient.dto.PatientRegistrationDto;
import com.clinicsaas.patient.dto.PatientResponseDto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

public class AsyncInvoiceDeliveryIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    public void testAsyncInvoiceBillingFlow_ReturnsImmediately_AndProcessesBgWorker() throws InterruptedException {
        // 1. Register Clinic Tenant
        RegisterRequest registerReq = new RegisterRequest();
        registerReq.setUsername("dr_suresh");
        registerReq.setPassword("password123");
        registerReq.setEmail("suresh@clinicos.com");
        registerReq.setFullName("Dr. Suresh");
        registerReq.setClinicName("Suresh Dental Clinic");

        ResponseEntity<AuthResponse> regResponse = restTemplate.postForEntity(
                "/api/auth/register", registerReq, AuthResponse.class);
        assertEquals(HttpStatus.CREATED, regResponse.getStatusCode());
        assertNotNull(regResponse.getBody());
        String token = regResponse.getBody().getToken();

        // 2. Register Patient under Clinic
        PatientRegistrationDto patientDto = new PatientRegistrationDto();
        patientDto.setName("Kamlesh Kumar");
        patientDto.setPhone("9123456789");
        patientDto.setConsentGiven(true);
        patientDto.setStreet("Dental St.");
        patientDto.setCity("Mumbai");
        patientDto.setState("MH");
        patientDto.setPostalCode("400001");

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        HttpEntity<PatientRegistrationDto> patientEntity = new HttpEntity<>(patientDto, headers);

        ResponseEntity<PatientResponseDto> patientResponse = restTemplate.postForEntity(
                "/api/patients", patientEntity, PatientResponseDto.class);
        assertEquals(HttpStatus.CREATED, patientResponse.getStatusCode());
        assertNotNull(patientResponse.getBody());
        UUID patientId = patientResponse.getBody().getId();

        // 3. Create Invoice Request (Immediate payment via CASH)
        InvoiceRequestDto invoiceDto = new InvoiceRequestDto();
        invoiceDto.setPatientId(patientId);
        invoiceDto.setPaymentMethod("CASH");
        
        InvoiceItemDto item1 = new InvoiceItemDto("Root Canal Treatment", 1, new BigDecimal("4500.00"));
        InvoiceItemDto item2 = new InvoiceItemDto("Dental Scaling", 1, new BigDecimal("1200.00"));
        invoiceDto.setItems(List.of(item1, item2));

        HttpEntity<InvoiceRequestDto> invoiceEntity = new HttpEntity<>(invoiceDto, headers);

        // Track API execution speed to verify the endpoint is non-blocking
        long startTime = System.currentTimeMillis();
        ResponseEntity<InvoiceResponseDto> invoiceResponse = restTemplate.postForEntity(
                "/api/invoices", invoiceEntity, InvoiceResponseDto.class);
        long duration = System.currentTimeMillis() - startTime;

        assertEquals(HttpStatus.CREATED, invoiceResponse.getStatusCode());
        assertNotNull(invoiceResponse.getBody());
        
        InvoiceResponseDto responseBody = invoiceResponse.getBody();
        UUID invoiceId = responseBody.getId();
        
        // Assert the API returns immediately (should be well below 200ms)
        assertTrue(duration < 250, "Invoice creation API should return immediately, took " + duration + "ms");
        assertEquals("PENDING", responseBody.getDeliveryStatus());
        assertEquals("PAID", responseBody.getStatus());

        // 4. Poll database to verify background worker finishes processing (setting status to DELIVERED)
        HttpEntity<Void> getInvoiceEntity = new HttpEntity<>(headers);
        boolean deliveryCompleted = false;
        
        // Poll every 500ms for up to 5 seconds
        for (int i = 0; i < 10; i++) {
            ResponseEntity<InvoiceResponseDto> polledInvoice = restTemplate.exchange(
                    "/api/invoices/" + invoiceId, HttpMethod.GET, getInvoiceEntity, InvoiceResponseDto.class);
            assertEquals(HttpStatus.OK, polledInvoice.getStatusCode());
            assertNotNull(polledInvoice.getBody());
            
            if ("DELIVERED".equals(polledInvoice.getBody().getDeliveryStatus())) {
                assertNotNull(polledInvoice.getBody().getPdfUrl());
                assertTrue(polledInvoice.getBody().getPdfUrl().contains("mock-signature-expires-in-1h") 
                        || polledInvoice.getBody().getPdfUrl().startsWith("http"));
                deliveryCompleted = true;
                break;
            }
            Thread.sleep(500);
        }

        assertTrue(deliveryCompleted, "Background worker should process the invoice and set delivery status to DELIVERED");
    }
}
