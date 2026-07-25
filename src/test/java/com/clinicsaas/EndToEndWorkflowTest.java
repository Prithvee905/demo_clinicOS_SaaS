package com.clinicsaas;

import com.clinicsaas.auth.domain.Clinic;
import com.clinicsaas.auth.domain.Role;
import com.clinicsaas.auth.domain.User;
import com.clinicsaas.auth.dto.AuthResponse;
import com.clinicsaas.auth.dto.LoginRequest;
import com.clinicsaas.auth.dto.RegisterRequest;
import com.clinicsaas.auth.repository.ClinicRepository;
import com.clinicsaas.auth.repository.UserRepository;
import com.clinicsaas.billing.dto.InvoiceResponseDto;
import com.clinicsaas.billing.repository.InvoiceRepository;
import com.clinicsaas.doctor.dto.DoctorRequestDto;
import com.clinicsaas.doctor.dto.DoctorResponseDto;
import com.clinicsaas.doctor.repository.DoctorRepository;
import com.clinicsaas.file.repository.FileRecordRepository;
import com.clinicsaas.notification.whatsapp.WhatsAppLog;
import com.clinicsaas.notification.whatsapp.WhatsAppLogRepository;
import com.clinicsaas.patient.dto.PatientRegistrationDto;
import com.clinicsaas.patient.dto.PatientResponseDto;
import com.clinicsaas.patient.repository.PatientRepository;
import com.clinicsaas.prescription.medicine.Medicine;
import com.clinicsaas.prescription.dto.PrescriptionItemDto;
import com.clinicsaas.prescription.dto.PrescriptionRequestDto;
import com.clinicsaas.prescription.dto.PrescriptionResponseDto;
import com.clinicsaas.prescription.medicine.MedicineRepository;
import com.clinicsaas.prescription.repository.PrescriptionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import java.math.BigDecimal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.annotation.Rollback;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.flyway.enabled=false"
})
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@Transactional
@Rollback(false)
public class EndToEndWorkflowTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private ClinicRepository clinicRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private MedicineRepository medicineRepository;

    @Autowired
    private PrescriptionRepository prescriptionRepository;

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private WhatsAppLogRepository whatsAppLogRepository;

    @Autowired
    private FileRecordRepository fileRecordRepository;

    @Autowired
    private ObjectMapper mapper;

    private static String adminToken;
    private static String doctorToken;
    private static String clinicCode;
    private static UUID clinicId;

    private static UUID doctorId;
    private static UUID patientId;
    private static UUID medicineId;
    private static UUID prescriptionId;
    private static UUID invoiceId;


    @Test
    @Order(1)
    public void testWorkflow_Step1_CreateClinic() throws Exception {
        System.out.println("\n========================================================");
        System.out.println("STEP 1: CREATE CLINIC");
        System.out.println("========================================================");

        RegisterRequest request = new RegisterRequest();
        request.setClinicName("Glow Dental Care");
        request.setClinicCode("glow-dental");
        request.setOwnerName("Dr. Sarah Paul");
        request.setClinicPhone("+91-9988776655");
        request.setClinicEmail("contact@glowdental.com");
        request.setClinicAddress("456, Health Enclave, Sector 5, Bangalore");
        request.setAdminEmail("admin@glowdental.com");
        request.setAdminName("Sarah Admin");
        request.setAdminPhone("+91-9988776650");
        request.setPassword("adminpass123");

        System.out.println("REQUEST PAYLOAD:");
        System.out.println(mapper.writerWithDefaultPrettyPrinter().writeValueAsString(request));

        ResponseEntity<AuthResponse> response = restTemplate.postForEntity(
                "/api/auth/register", request, AuthResponse.class);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        
        AuthResponse resBody = response.getBody();
        assertNotNull(resBody.getAccessToken());
        assertNotNull(resBody.getRefreshToken());
        assertEquals("glow-dental", resBody.getClinicCode());

        adminToken = resBody.getAccessToken();
        clinicCode = resBody.getClinicCode();
        clinicId = UUID.fromString(resBody.getClinicId());

        System.out.println("RESPONSE PAYLOAD:");
        System.out.println(mapper.writerWithDefaultPrettyPrinter().writeValueAsString(resBody));

        // DB verification
        Clinic clinic = clinicRepository.findById(clinicId).orElse(null);
        assertNotNull(clinic);
        System.out.println("DATABASE CLINIC RECORD:");
        System.out.println("Clinic ID: " + clinic.getId());
        System.out.println("Clinic Name: " + clinic.getName());
        System.out.println("Clinic Code: " + clinic.getClinicCode());
        System.out.println("Clinic Status: " + clinic.getStatus());

        // Verify duplicate clinic email fails registration
        RegisterRequest dupClinicEmailRequest = new RegisterRequest();
        dupClinicEmailRequest.setClinicName("Glow Dental Branch");
        dupClinicEmailRequest.setClinicCode("glow-dental-branch");
        dupClinicEmailRequest.setOwnerName("Dr. Sarah Paul");
        dupClinicEmailRequest.setClinicPhone("+91-9988776699");
        dupClinicEmailRequest.setClinicEmail("contact@glowdental.com"); // Duplicate
        dupClinicEmailRequest.setClinicAddress("789, Health Enclave, Bangalore");
        dupClinicEmailRequest.setAdminEmail("admin-branch@glowdental.com"); // Unique
        dupClinicEmailRequest.setAdminName("Branch Admin");
        dupClinicEmailRequest.setAdminPhone("+91-9988776690");
        dupClinicEmailRequest.setPassword("adminpass123");

        ResponseEntity<String> dupClinicEmailResponse = restTemplate.postForEntity(
                "/api/auth/register", dupClinicEmailRequest, String.class);
        assertEquals(HttpStatus.BAD_REQUEST, dupClinicEmailResponse.getStatusCode());
        assertTrue(dupClinicEmailResponse.getBody().contains("Clinic email already registered"));

        // Verify duplicate admin email fails registration
        RegisterRequest dupAdminEmailRequest = new RegisterRequest();
        dupAdminEmailRequest.setClinicName("Glow Dental Allied");
        dupAdminEmailRequest.setClinicCode("glow-dental-allied");
        dupAdminEmailRequest.setOwnerName("Dr. Sarah Paul");
        dupAdminEmailRequest.setClinicPhone("+91-9988776688");
        dupAdminEmailRequest.setClinicEmail("contact-allied@glowdental.com"); // Unique
        dupAdminEmailRequest.setClinicAddress("123, Allied Enclave, Bangalore");
        dupAdminEmailRequest.setAdminEmail("admin@glowdental.com"); // Duplicate
        dupAdminEmailRequest.setAdminName("Allied Admin");
        dupAdminEmailRequest.setAdminPhone("+91-9988776680");
        dupAdminEmailRequest.setPassword("adminpass123");

        ResponseEntity<String> dupAdminEmailResponse = restTemplate.postForEntity(
                "/api/auth/register", dupAdminEmailRequest, String.class);
        assertEquals(HttpStatus.BAD_REQUEST, dupAdminEmailResponse.getStatusCode());
        assertTrue(dupAdminEmailResponse.getBody().contains("Email already registered"));
    }

    @Test
    @Order(2)
    public void testWorkflow_Step2_Login() throws Exception {
        System.out.println("\n========================================================");
        System.out.println("STEP 2: LOGIN");
        System.out.println("========================================================");

        LoginRequest request = new LoginRequest();
        request.setEmail("admin@glowdental.com");
        request.setPassword("adminpass123");
        request.setClinicCode(clinicCode);

        System.out.println("REQUEST PAYLOAD:");
        System.out.println(mapper.writerWithDefaultPrettyPrinter().writeValueAsString(request));

        ResponseEntity<AuthResponse> response = restTemplate.postForEntity(
                "/api/auth/login", request, AuthResponse.class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());

        AuthResponse resBody = response.getBody();
        assertEquals(Role.ADMIN.name(), resBody.getRole());

        System.out.println("RESPONSE PAYLOAD:");
        System.out.println(mapper.writerWithDefaultPrettyPrinter().writeValueAsString(resBody));

        // DB Verification
        User adminUser = userRepository.findByEmailAndClinicIdAndStatus("admin@glowdental.com", clinicId, "ACTIVE").orElse(null);
        assertNotNull(adminUser);
        System.out.println("DATABASE USER RECORD:");
        System.out.println("User ID: " + adminUser.getId());
        System.out.println("User Name: " + adminUser.getName());
        System.out.println("User Email: " + adminUser.getEmail());
        System.out.println("User Role: " + adminUser.getRole());
        System.out.println("Last Login Time: " + adminUser.getLastLogin());
    }

    @Test
    @Order(3)
    public void testWorkflow_Step3_CreateDoctor() throws Exception {
        System.out.println("\n========================================================");
        System.out.println("STEP 3: CREATE DOCTOR (ADMIN ONLY)");
        System.out.println("========================================================");

        DoctorRequestDto request = new DoctorRequestDto();
        request.setName("Ramesh Gupta");
        request.setSpecialization("Orthodontist");
        request.setRegistrationNumber("DMC-5678");
        request.setConsultationFee(new BigDecimal("650.00"));
        request.setEmail("ramesh@glowdental.com");
        request.setPhone("9876543201");
        request.setPassword("doctorpass123");

        System.out.println("REQUEST PAYLOAD:");
        System.out.println(mapper.writerWithDefaultPrettyPrinter().writeValueAsString(request));

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);
        HttpEntity<DoctorRequestDto> entity = new HttpEntity<>(request, headers);

        ResponseEntity<DoctorResponseDto> response = restTemplate.postForEntity(
                "/api/doctors", entity, DoctorResponseDto.class);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());

        DoctorResponseDto resBody = response.getBody();
        doctorId = resBody.getId();
        assertNotNull(doctorId);

        System.out.println("RESPONSE PAYLOAD:");
        System.out.println(mapper.writerWithDefaultPrettyPrinter().writeValueAsString(resBody));

        // Authenticate as this doctor to get doctorToken for future steps
        LoginRequest docLogin = new LoginRequest();
        docLogin.setEmail("ramesh@glowdental.com");
        docLogin.setPassword("doctorpass123");
        docLogin.setClinicCode(clinicCode);
        
        ResponseEntity<AuthResponse> loginRes = restTemplate.postForEntity(
                "/api/auth/login", docLogin, AuthResponse.class);
        assertEquals(HttpStatus.OK, loginRes.getStatusCode());
        assertNotNull(loginRes.getBody());
        doctorToken = loginRes.getBody().getAccessToken();

        // DB Verification
        com.clinicsaas.doctor.domain.Doctor doc = doctorRepository.findById(doctorId).orElse(null);
        assertNotNull(doc);
        System.out.println("DATABASE DOCTOR RECORD:");
        System.out.println("Doctor ID: " + doc.getId());
        System.out.println("Doctor Name: " + doc.getName());
        System.out.println("Doctor Specialization: " + doc.getSpecialization());
        System.out.println("Linked User Account ID: " + doc.getUser().getId());
        System.out.println("Consultation Fee: " + doc.getConsultationFee());
    }

    @Test
    @Order(4)
    public void testWorkflow_Step4_CreatePatient() throws Exception {
        System.out.println("\n========================================================");
        System.out.println("STEP 4: CREATE PATIENT");
        System.out.println("========================================================");

        PatientRegistrationDto request = new PatientRegistrationDto();
        request.setName("Rahul Kumar");
        request.setPhone("9988770001");
        request.setGender("Male");
        request.setDateOfBirth(LocalDate.of(1995, 8, 15));
        request.setAddress("Flat 102, Sunrise Apts, Whitefield, Bangalore");
        request.setBloodGroup("O+");

        System.out.println("REQUEST PAYLOAD:");
        System.out.println(mapper.writerWithDefaultPrettyPrinter().writeValueAsString(request));

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);
        HttpEntity<PatientRegistrationDto> entity = new HttpEntity<>(request, headers);

        ResponseEntity<PatientResponseDto> response = restTemplate.postForEntity(
                "/api/patients", entity, PatientResponseDto.class);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());

        PatientResponseDto resBody = response.getBody();
        patientId = resBody.getId();
        assertNotNull(patientId);

        System.out.println("RESPONSE PAYLOAD:");
        System.out.println(mapper.writerWithDefaultPrettyPrinter().writeValueAsString(resBody));

        // DB Verification
        com.clinicsaas.patient.domain.Patient patient = patientRepository.findById(patientId).orElse(null);
        assertNotNull(patient);
        System.out.println("DATABASE PATIENT RECORD:");
        System.out.println("Patient ID: " + patient.getId());
        System.out.println("Patient Code (Sequential): " + patient.getPatientCode());
        System.out.println("Patient Name: " + patient.getName());
        System.out.println("Patient Phone: " + patient.getPhone());
    }

    @Test
    @Order(5)
    public void testWorkflow_Step5_CreateMedicine() throws Exception {
        System.out.println("\n========================================================");
        System.out.println("STEP 5: CREATE MEDICINE (ADMIN ONLY)");
        System.out.println("========================================================");

        Medicine request = new Medicine();
        request.setMedicineName("Amoxicillin 500mg");
        request.setMedicineCode("AMX-500");
        request.setUnitPrice(new BigDecimal("12.50"));
        request.setGstPercentage(new BigDecimal("12.00"));
        request.setUnitType("Capsule");

        System.out.println("REQUEST PAYLOAD:");
        System.out.println(mapper.writerWithDefaultPrettyPrinter().writeValueAsString(request));

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);
        HttpEntity<Medicine> entity = new HttpEntity<>(request, headers);

        ResponseEntity<Medicine> response = restTemplate.postForEntity(
                "/api/medicines", entity, Medicine.class);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());

        Medicine resBody = response.getBody();
        medicineId = resBody.getId();
        assertNotNull(medicineId);

        System.out.println("RESPONSE PAYLOAD:");
        System.out.println(mapper.writerWithDefaultPrettyPrinter().writeValueAsString(resBody));

        // DB Verification
        Medicine med = medicineRepository.findById(medicineId).orElse(null);
        assertNotNull(med);
        System.out.println("DATABASE MEDICINE RECORD:");
        System.out.println("Medicine ID: " + med.getId());
        System.out.println("Medicine Code: " + med.getMedicineCode());
        System.out.println("Medicine Name: " + med.getMedicineName());
        System.out.println("Unit Price: INR " + med.getUnitPrice());
        System.out.println("GST Rate: " + med.getGstPercentage() + "%");
    }

    @Test
    @Order(6)
    public void testWorkflow_Step6_CreatePrescription() throws Exception {
        System.out.println("\n========================================================");
        System.out.println("STEP 6: CREATE PRESCRIPTION (DOCTOR ONLY)");
        System.out.println("========================================================");

        PrescriptionRequestDto request = new PrescriptionRequestDto();
        request.setPatientId(patientId);
        request.setDoctorId(doctorId);
        request.setConsultationFee(new BigDecimal("650.00"));
        request.setDoctorNotes("Acute dental pain in lower left molar. Diagnosed as pulpitis. Prescribed course of antibiotics.");

        PrescriptionItemDto item = new PrescriptionItemDto();
        item.setMedicineId(medicineId);
        item.setQuantity(15);
        item.setDosage("1-0-1");
        item.setFrequency("Daily (After meals)");
        item.setDuration("5 days");
        item.setRemarks("Complete the full course");

        request.setItems(List.of(item));

        System.out.println("REQUEST PAYLOAD:");
        System.out.println(mapper.writerWithDefaultPrettyPrinter().writeValueAsString(request));

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(doctorToken); // Doctor's own token
        HttpEntity<PrescriptionRequestDto> entity = new HttpEntity<>(request, headers);

        ResponseEntity<PrescriptionResponseDto> response = restTemplate.postForEntity(
                "/api/prescriptions", entity, PrescriptionResponseDto.class);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());

        PrescriptionResponseDto resBody = response.getBody();
        prescriptionId = resBody.getId();
        assertEquals("DRAFT", resBody.getStatus());

        System.out.println("RESPONSE PAYLOAD:");
        System.out.println(mapper.writerWithDefaultPrettyPrinter().writeValueAsString(resBody));

        // DB Verification
        com.clinicsaas.prescription.domain.Prescription p = prescriptionRepository.findById(prescriptionId).orElse(null);
        assertNotNull(p);
        System.out.println("DATABASE PRESCRIPTION RECORD (DRAFT):");
        System.out.println("Prescription ID: " + p.getId());
        System.out.println("Prescription Status: " + p.getStatus());
        System.out.println("Prescription Date: " + p.getPrescriptionDate());
        System.out.println("Draft Items Count: " + p.getItems().size());
    }

    @Test
    @Order(7)
    public void testWorkflow_Step7_CompletePrescription() throws Exception {
        System.out.println("\n========================================================");
        System.out.println("STEP 7: COMPLETE PRESCRIPTION (DOCTOR ONLY)");
        System.out.println("========================================================");

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(doctorToken); // Doctor's own token
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        System.out.println("REQUESTING COMPLETION FOR PRESCRIPTION ID: " + prescriptionId);

        ResponseEntity<PrescriptionResponseDto> response = restTemplate.postForEntity(
                "/api/prescriptions/" + prescriptionId + "/complete", entity, PrescriptionResponseDto.class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());

        PrescriptionResponseDto resBody = response.getBody();
        assertEquals("COMPLETED", resBody.getStatus());
        assertNotNull(resBody.getItems().get(0).getUnitPriceSnapshot());

        System.out.println("RESPONSE PAYLOAD:");
        System.out.println(mapper.writerWithDefaultPrettyPrinter().writeValueAsString(resBody));

        // DB Verification
        com.clinicsaas.prescription.domain.Prescription p = prescriptionRepository.findById(prescriptionId).orElse(null);
        assertNotNull(p);
        System.out.println("DATABASE PRESCRIPTION RECORD (COMPLETED):");
        System.out.println("Prescription ID: " + p.getId());
        System.out.println("Prescription Status: " + p.getStatus());
        System.out.println("Medicine Unit Price Snapshot: INR " + p.getItems().get(0).getUnitPriceSnapshot());
        System.out.println("Medicine GST Snapshot: " + p.getItems().get(0).getGstPercentageSnapshot() + "%");
    }

    @Test
    @Order(8)
    public void testWorkflow_Step8_GenerateInvoice() throws Exception {
        System.out.println("\n========================================================");
        System.out.println("STEP 8: GENERATE INVOICE");
        System.out.println("========================================================");

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        System.out.println("REQUESTING INVOICE GENERATION FOR PRESCRIPTION ID: " + prescriptionId);

        ResponseEntity<InvoiceResponseDto> response = restTemplate.postForEntity(
                "/api/invoices/generate/" + prescriptionId, entity, InvoiceResponseDto.class);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());

        InvoiceResponseDto resBody = response.getBody();
        invoiceId = resBody.getId();
        assertEquals("GENERATED", resBody.getStatus());
        
        // Assert math calculations:
        // Medicine subtotal = 12.50 * 15 = 187.50
        // Medicine GST = 187.50 * 0.12 = 22.50
        // Consultation fee = 650.00
        // Subtotal = 187.50 + 650.00 = 837.50
        // Tax Amount = 22.50
        // Grand Total = 837.50 + 22.50 = 860.00
        assertEquals(0, new BigDecimal("837.50").compareTo(resBody.getSubtotal()));
        assertEquals(0, new BigDecimal("22.50").compareTo(resBody.getTaxAmount()));
        assertEquals(0, new BigDecimal("860.00").compareTo(resBody.getGrandTotal()));

        System.out.println("RESPONSE PAYLOAD:");
        System.out.println(mapper.writerWithDefaultPrettyPrinter().writeValueAsString(resBody));

        // DB Verification
        com.clinicsaas.billing.domain.Invoice inv = invoiceRepository.findById(invoiceId).orElse(null);
        assertNotNull(inv);
        System.out.println("DATABASE INVOICE RECORD:");
        System.out.println("Invoice ID: " + inv.getId());
        System.out.println("Invoice Number (Sequential): " + inv.getInvoiceNumber());
        System.out.println("Invoice Grand Total: INR " + inv.getGrandTotal());
        System.out.println("Linked File Record ID: " + inv.getFile().getId());
    }

    @Test
    @Order(9)
    public void testWorkflow_Step9_GeneratePDF_And_Step10_UploadFile() throws Exception {
        System.out.println("\n========================================================");
        System.out.println("STEPS 9 & 10: PDF GENERATION & FILE UPLOAD (VERIFICATION)");
        System.out.println("========================================================");

        com.clinicsaas.billing.domain.Invoice inv = invoiceRepository.findById(invoiceId).orElse(null);
        assertNotNull(inv);
        assertNotNull(inv.getFile());

        com.clinicsaas.file.domain.FileRecord fileRecord = inv.getFile();

        System.out.println("FILE STORAGE DATABASE RECORD:");
        System.out.println("File ID: " + fileRecord.getId());
        System.out.println("File Name: " + fileRecord.getFileName());
        System.out.println("Content Type: " + fileRecord.getFileType());
        System.out.println("S3 Key Path: " + fileRecord.getS3Key());
        System.out.println("Presigned Access URL: " + fileRecord.getUrl());

        // Call the GET /api/invoices/{id}/pdf endpoint to verify redirect
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        ResponseEntity<Void> response = restTemplate.exchange(
                "/api/invoices/" + invoiceId + "/pdf", HttpMethod.GET, entity, Void.class);

        // Should return a 302 FOUND redirecting to the pre-signed URL
        assertEquals(HttpStatus.FOUND, response.getStatusCode());
        assertNotNull(response.getHeaders().getLocation());
        System.out.println("PDF ENDPOINT REDIRECT LOCATION: " + response.getHeaders().getLocation());
    }

    @Test
    @Order(11)
    public void testWorkflow_Step11_SendWhatsApp() throws Exception {
        System.out.println("\n========================================================");
        System.out.println("STEP 11: SEND WHATSAPP MESSAGE");
        System.out.println("========================================================");

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        System.out.println("DISPATCHING INVOICE VIA WHATSAPP. INVOICE ID: " + invoiceId);

        ResponseEntity<WhatsAppLog> response = restTemplate.postForEntity(
                "/api/whatsapp/send-invoice/" + invoiceId, entity, WhatsAppLog.class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());

        WhatsAppLog logRecord = response.getBody();
        assertEquals("DELIVERED", logRecord.getStatus());
        assertNotNull(logRecord.getMessageId());

        System.out.println("RESPONSE PAYLOAD:");
        System.out.println(mapper.writerWithDefaultPrettyPrinter().writeValueAsString(logRecord));

        // DB Verification
        List<WhatsAppLog> dbLogs = whatsAppLogRepository.findByInvoiceIdAndClinicId(invoiceId, clinicId);
        assertFalse(dbLogs.isEmpty());
        WhatsAppLog dbLog = dbLogs.get(0);
        System.out.println("DATABASE WHATSAPP LOG RECORD:");
        System.out.println("Log Record ID: " + dbLog.getId());
        System.out.println("Recipient Phone: " + dbLog.getPhoneNumber());
        System.out.println("Message Delivery Status: " + dbLog.getStatus());
        System.out.println("Message ID: " + dbLog.getMessageId());
        System.out.println("Dispatched At: " + dbLog.getSentAt());
    }
}
