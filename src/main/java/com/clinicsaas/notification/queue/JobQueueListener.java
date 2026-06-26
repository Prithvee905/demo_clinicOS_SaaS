package com.clinicsaas.notification.queue;

import com.clinicsaas.billing.dto.InvoiceResponseDto;
import com.clinicsaas.billing.service.BillingService;
import com.clinicsaas.common.tenant.TenantContext;
import com.clinicsaas.event.InvoiceCreatedEvent;
import com.clinicsaas.patient.dto.PatientResponseDto;
import com.clinicsaas.patient.service.PatientService;
import com.clinicsaas.notification.pdf.PdfGeneratorService;
import com.clinicsaas.notification.pdf.S3StorageService;
import com.clinicsaas.notification.whatsapp.WhatsAppSenderService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;

@Component
public class JobQueueListener implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(JobQueueListener.class);
    private static final String QUEUE_KEY = "queue:invoice-delivery";

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Autowired
    private ExecutorService virtualThreadExecutor;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private BillingService billingService;

    @Autowired
    private PatientService patientService;

    @Autowired
    private PdfGeneratorService pdfGeneratorService;

    @Autowired
    private S3StorageService s3StorageService;

    @Autowired
    private WhatsAppSenderService whatsAppSenderService;

    private volatile boolean running = true;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleInvoiceCreatedEvent(InvoiceCreatedEvent event) {
        try {
            Map<String, String> payload = new HashMap<>();
            payload.put("invoiceId", event.getInvoiceId().toString());
            payload.put("tenantId", event.getTenantId().toString());
            String json = objectMapper.writeValueAsString(payload);
            
            log.info("Queueing invoice delivery job for invoice: {}", event.getInvoiceId());
            redisTemplate.opsForList().leftPush(QUEUE_KEY, json);
        } catch (Exception e) {
            log.error("Failed to queue invoice delivery job", e);
        }
    }

    @Override
    public void run(String... args) throws Exception {
        log.info("Starting background Redis job queue worker on virtual thread pool...");
        virtualThreadExecutor.submit(this::pollQueueLoop);
    }

    private void pollQueueLoop() {
        while (running) {
            try {
                // Perform a blocking pop with a 30 second timeout
                String jobJson = redisTemplate.opsForList().rightPop(QUEUE_KEY, Duration.ofSeconds(30));
                if (jobJson != null && !jobJson.isBlank()) {
                    log.info("Popped invoice delivery job: {}", jobJson);
                    processJob(jobJson);
                }
            } catch (Exception e) {
                log.error("Error in Redis queue polling loop. Retrying in 2 seconds...", e);
                try {
                    Thread.sleep(2000);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                }
            }
        }
    }

    @SuppressWarnings("unchecked")
    private void processJob(String jobJson) {
        Map<String, String> jobData;
        try {
            jobData = objectMapper.readValue(jobJson, Map.class);
        } catch (Exception e) {
            log.error("Failed to parse job JSON: " + jobJson, e);
            return;
        }

        String invoiceIdStr = jobData.get("invoiceId");
        String tenantIdStr = jobData.get("tenantId");

        if (invoiceIdStr == null || tenantIdStr == null) {
            log.error("Invalid job payload: {}", jobJson);
            return;
        }

        UUID invoiceId = UUID.fromString(invoiceIdStr);

        try {
            // Establish the tenant context for this background thread
            TenantContext.setTenantId(tenantIdStr);
            TenantContext.setCurrentRole("SYSTEM"); // Background operations run as system

            // Retrieve invoice details (RLS is active, but matches the tenant context we set)
            InvoiceResponseDto invoice = billingService.getInvoiceById(invoiceId);

            // Fetch patient information (cross-module via service)
            PatientResponseDto patient = patientService.getPatientById(invoice.getPatientId());

            // Generate invoice PDF
            byte[] pdfBytes = pdfGeneratorService.generateInvoicePdf(invoice, patient.getName());

            // Upload PDF to S3 and generate presigned link
            String fileKey = String.format("%s/invoices/%s-%s.pdf", tenantIdStr, invoice.getInvoiceNumber(), invoiceIdStr);
            String presignedUrl = s3StorageService.uploadAndPresign(fileKey, pdfBytes);

            // Send via Meta WhatsApp API (Retry is handled inside this service via Resilience4j)
            whatsAppSenderService.sendInvoiceNotification(
                    patient.getPhone(),
                    patient.getName(),
                    invoice.getInvoiceNumber(),
                    presignedUrl
            );

            // Update delivery status on DB
            billingService.updateDeliveryStatus(invoiceId, "DELIVERED", presignedUrl);
            log.info("Invoice {} successfully generated and sent to patient {}", invoice.getInvoiceNumber(), patient.getName());

        } catch (Exception e) {
            log.error("Failed to execute invoice delivery job for invoice: " + invoiceIdStr, e);
            try {
                // If everything failed, mark delivery status as failed in database
                billingService.updateDeliveryStatus(invoiceId, "FAILED", null);
            } catch (Exception dbEx) {
                log.error("Failed to write FAILED delivery status to database", dbEx);
            }
        } finally {
            // Guarantee cleanup of thread context
            TenantContext.clear();
        }
    }

    public void stop() {
        this.running = false;
    }
}
