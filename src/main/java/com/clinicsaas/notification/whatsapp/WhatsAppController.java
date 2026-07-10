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
