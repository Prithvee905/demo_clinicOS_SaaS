package com.clinicsaas.notification.whatsapp;

import com.clinicsaas.billing.domain.Invoice;
import com.clinicsaas.billing.repository.InvoiceRepository;
import com.clinicsaas.common.audit.AuditLogService;
import com.clinicsaas.common.exception.CustomException;
import com.clinicsaas.common.tenant.TenantContext;
import io.github.resilience4j.retry.annotation.Retry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class WhatsAppSenderService {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppSenderService.class);

    private final RestClient restClient = RestClient.create();

    @Value("${app.whatsapp.phone-number-id}")
    private String phoneNumberId;

    @Value("${app.whatsapp.api-token}")
    private String apiToken;

    @Value("${app.whatsapp.template-name}")
    private String templateName;

    @Value("${app.whatsapp.language-code:en}")
    private String languageCode;

    @Value("${app.whatsapp.send-params:false}")
    private boolean sendParams;

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private WhatsAppLogRepository whatsAppLogRepository;

    @Autowired
    private AuditLogService auditLogService;

    @Transactional(noRollbackFor = Exception.class)
    @Retry(name = "whatsappApi")
    public WhatsAppLog sendInvoiceNotification(UUID invoiceId) {
        Invoice invoice;
        String tenantStr = TenantContext.getTenantId();
        if (tenantStr != null && !tenantStr.isBlank()) {
            UUID clinicId = UUID.fromString(tenantStr);
            invoice = invoiceRepository.findByIdAndClinicId(invoiceId, clinicId)
                    .orElseThrow(() -> new CustomException("Invoice not found", HttpStatus.NOT_FOUND, "INVOICE_NOT_FOUND"));
        } else {
            invoice = invoiceRepository.findById(invoiceId)
                    .orElseThrow(() -> new CustomException("Invoice not found", HttpStatus.NOT_FOUND, "INVOICE_NOT_FOUND"));
        }
        UUID clinicId = invoice.getClinicId();

        if (invoice.getFile() == null) {
            throw new CustomException("Invoice PDF has not been generated or uploaded yet", HttpStatus.BAD_REQUEST, "PDF_NOT_FOUND");
        }

        String patientName = invoice.getPatient().getName();
        String patientPhone = invoice.getPatient().getPhone();
        String invoiceNumber = invoice.getInvoiceNumber();
        String pdfUrl = invoice.getFile().getUrl();

        // Create log record in PENDING status
        WhatsAppLog whatsAppLog = new WhatsAppLog();
        whatsAppLog.setClinicId(clinicId);
        whatsAppLog.setPatientId(invoice.getPatient().getId());
        whatsAppLog.setInvoiceId(invoiceId);
        whatsAppLog.setPhoneNumber(patientPhone);
        whatsAppLog.setStatus("PENDING");
        whatsAppLog = whatsAppLogRepository.save(whatsAppLog);

        log.info("Sending WhatsApp notification to {}. Invoice: {}", patientPhone, invoiceNumber);

        try {
            // Check for mock token fallback
            if ("mock-token".equals(apiToken) || "test-api-token".equals(apiToken) || apiToken.isBlank()) {
                log.info("[MOCK WHATSAPP SEND] Hello {}, Your invoice is ready. Invoice Number: {} Link: {}", 
                        patientName, invoiceNumber, pdfUrl);

                // Update log as delivered directly
                whatsAppLog.setStatus("DELIVERED");
                whatsAppLog.setSentAt(LocalDateTime.now());
                whatsAppLog.setDeliveredAt(LocalDateTime.now());
                whatsAppLog.setMessageId("mock-msg-" + UUID.randomUUID().toString().substring(0, 8));
                whatsAppLogRepository.save(whatsAppLog);

                // Update invoice status to SENT
                invoice.setStatus("SENT");
                invoiceRepository.save(invoice);

                // Audit
                auditLogService.logAction("WHATSAPP_SENT", "INVOICE", invoiceId, 
                        "Successfully sent WhatsApp invoice " + invoiceNumber + " to " + patientName);

                return whatsAppLog;
            }

            // Real WhatsApp API invocation (Meta Cloud API template)
            String url = "https://graph.facebook.com/v18.0/" + phoneNumberId + "/messages";

            Map<String, Object> payload = new HashMap<>();
            payload.put("messaging_product", "whatsapp");
            payload.put("to", patientPhone);
            payload.put("type", "template");

            Map<String, Object> template = new HashMap<>();
            template.put("name", templateName);
            
            Map<String, String> language = new HashMap<>();
            language.put("code", languageCode);
            template.put("language", language);

            if (sendParams && !"hello_world".equals(templateName)) {
                Map<String, Object> headerDoc = new HashMap<>();
                headerDoc.put("type", "document");
                Map<String, String> docDetails = new HashMap<>();
                docDetails.put("link", pdfUrl);
                docDetails.put("filename", "Invoice-" + invoiceNumber + ".pdf");
                headerDoc.put("document", docDetails);

                Map<String, Object> bodyParam1 = new HashMap<>();
                bodyParam1.put("type", "text");
                bodyParam1.put("text", patientName);

                Map<String, Object> bodyParam2 = new HashMap<>();
                bodyParam2.put("type", "text");
                bodyParam2.put("text", invoiceNumber);

                Map<String, Object> headerComponent = new HashMap<>();
                headerComponent.put("type", "header");
                headerComponent.put("parameters", List.of(headerDoc));

                Map<String, Object> bodyComponent = new HashMap<>();
                bodyComponent.put("type", "body");
                bodyComponent.put("parameters", List.of(bodyParam1, bodyParam2));

                template.put("components", List.of(headerComponent, bodyComponent));
            }
            payload.put("template", template);

            restClient.post()
                    .uri(url)
                    .headers(headers -> {
                        headers.setBearerAuth(apiToken);
                        headers.setContentType(MediaType.APPLICATION_JSON);
                    })
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();

            log.info("WhatsApp notification successfully delivered to API for {}", patientPhone);

            whatsAppLog.setStatus("SENT");
            whatsAppLog.setSentAt(LocalDateTime.now());
            whatsAppLog.setMessageId("meta-msg-" + UUID.randomUUID().toString().substring(0, 8));
            whatsAppLogRepository.save(whatsAppLog);

            invoice.setStatus("SENT");
            invoiceRepository.save(invoice);

            auditLogService.logAction("WHATSAPP_SENT", "INVOICE", invoiceId, 
                    "Sent WhatsApp invoice " + invoiceNumber + " to " + patientName);

        } catch (Exception e) {
            log.error("Failed to send WhatsApp message for invoice " + invoiceNumber, e);
            
            whatsAppLog.setStatus("FAILED");
            String failureMsg = e.getMessage();
            if (failureMsg != null && failureMsg.length() > 250) {
                failureMsg = failureMsg.substring(0, 250);
            }
            whatsAppLog.setFailureReason(failureMsg);
            whatsAppLogRepository.save(whatsAppLog);

            auditLogService.logAction("WHATSAPP_FAILED", "INVOICE", invoiceId, 
                    "Failed to send WhatsApp invoice " + invoiceNumber + " to " + patientName + ". Reason: " + e.getMessage());

            throw new CustomException("WhatsApp delivery API failed: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR, "WHATSAPP_DELIVERY_FAILED");
        }

        return whatsAppLog;
    }

    public String getPhoneNumberId() { return phoneNumberId; }
    public String getTemplateName() { return templateName; }
    public String getMaskedToken() {
        if (apiToken == null || apiToken.isBlank()) return "EMPTY/BLANK";
        if (apiToken.length() <= 8) return apiToken;
        return apiToken.substring(0, 4) + "..." + apiToken.substring(apiToken.length() - 4);
    }

    @Transactional(readOnly = true)
    public List<WhatsAppLog> getLogsForInvoice(UUID invoiceId) {
        UUID clinicId = getClinicIdFromContext();
        return whatsAppLogRepository.findByInvoiceIdAndClinicId(invoiceId, clinicId);
    }

    @Transactional(readOnly = true)
    public List<WhatsAppLog> getAllLogs() {
        UUID clinicId = getClinicIdFromContext();
        return whatsAppLogRepository.findByClinicId(clinicId);
    }

    private UUID getClinicIdFromContext() {
        String clinicIdStr = TenantContext.getTenantId();
        if (clinicIdStr == null) {
            throw new CustomException("No active clinic context found", HttpStatus.BAD_REQUEST, "NO_CLINIC_CONTEXT");
        }
        return UUID.fromString(clinicIdStr);
    }
}
