package com.clinicsaas.notification.whatsapp;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/whatsapp")
public class WhatsAppController {

    @Autowired
    private WhatsAppSenderService whatsAppSenderService;

    @Autowired
    private com.clinicsaas.notification.pdf.S3StorageService s3StorageService;

    @GetMapping("/test-send/{invoiceId}")
    public ResponseEntity<String> testSend(@PathVariable UUID invoiceId) {
        try {
            WhatsAppLog log = whatsAppSenderService.sendInvoiceNotification(invoiceId);
            return ResponseEntity.ok("Success: Status = " + log.getStatus() + ", MessageID = " + log.getMessageId());
        } catch (Exception e) {
            java.io.StringWriter sw = new java.io.StringWriter();
            java.io.PrintWriter pw = new java.io.PrintWriter(sw);
            e.printStackTrace(pw);
            return ResponseEntity.status(500).body("Failed: " + e.getMessage() + "\nStacktrace:\n" + sw.toString());
        }
    }

    @Autowired
    private com.clinicsaas.billing.repository.InvoiceRepository invoiceRepository;

    @GetMapping("/debug-send-latest")
    public ResponseEntity<String> debugSendLatest() {
        try {
            List<com.clinicsaas.billing.domain.Invoice> invoices = invoiceRepository.findAll();
            if (invoices.isEmpty()) {
                return ResponseEntity.ok("No invoices found in database to test.");
            }
            com.clinicsaas.billing.domain.Invoice latest = invoices.get(invoices.size() - 1);
            WhatsAppLog log = whatsAppSenderService.sendInvoiceNotification(latest.getId());
            return ResponseEntity.ok("Success! Sent WhatsApp for Invoice " + latest.getInvoiceNumber() + " to " + latest.getPatient().getPhone() + ". Status: " + log.getStatus() + ", MsgID: " + log.getMessageId());
        } catch (Exception e) {
            java.io.StringWriter sw = new java.io.StringWriter();
            java.io.PrintWriter pw = new java.io.PrintWriter(sw);
            e.printStackTrace(pw);
            return ResponseEntity.status(500).body("Failed to send WhatsApp:\nError Message: " + e.getMessage() + "\n\nStacktrace:\n" + sw.toString());
        }
    }

    @GetMapping("/debug-config")
    public ResponseEntity<java.util.Map<String, String>> debugConfig() {
        java.util.Map<String, String> map = new java.util.HashMap<>();
        map.put("phoneNumberId", whatsAppSenderService.getPhoneNumberId());
        map.put("apiTokenMasked", whatsAppSenderService.getMaskedToken());
        map.put("templateName", whatsAppSenderService.getTemplateName());
        return ResponseEntity.ok(map);
    }

    @GetMapping("/test-s3")
    public ResponseEntity<String> testS3() {
        try {
            String url = s3StorageService.uploadAndPresign("test-debug-key", "test-content".getBytes());
            return ResponseEntity.ok("Success: " + url);
        } catch (Exception e) {
            java.io.StringWriter sw = new java.io.StringWriter();
            java.io.PrintWriter pw = new java.io.PrintWriter(sw);
            e.printStackTrace(pw);
            return ResponseEntity.status(500).body("Failed: " + e.getMessage() + "\nStacktrace:\n" + sw.toString());
        }
    }

    @PostMapping("/send-invoice/{invoiceId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<WhatsAppLog> sendInvoice(@PathVariable UUID invoiceId) {
        WhatsAppLog log = whatsAppSenderService.sendInvoiceNotification(invoiceId);
        return ResponseEntity.ok(log);
    }

    @GetMapping("/logs/invoice/{invoiceId}")
    public ResponseEntity<List<WhatsAppLog>> getLogsForInvoice(@PathVariable UUID invoiceId) {
        List<WhatsAppLog> logs = whatsAppSenderService.getLogsForInvoice(invoiceId);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/logs")
    public ResponseEntity<List<WhatsAppLog>> getAllLogs() {
        List<WhatsAppLog> logs = whatsAppSenderService.getAllLogs();
        return ResponseEntity.ok(logs);
    }
}
