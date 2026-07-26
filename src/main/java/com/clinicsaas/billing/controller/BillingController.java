package com.clinicsaas.billing.controller;

import com.clinicsaas.billing.dto.InvoiceResponseDto;
import com.clinicsaas.billing.service.BillingService;
import com.clinicsaas.common.exception.CustomException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/invoices")
public class BillingController {

    @Autowired
    private BillingService billingService;

    @PostMapping("/generate/{prescriptionId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<InvoiceResponseDto> generateInvoice(@PathVariable UUID prescriptionId) {
        InvoiceResponseDto response = billingService.generateInvoiceFromPrescription(prescriptionId);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<InvoiceResponseDto> getInvoiceById(@PathVariable UUID id) {
        InvoiceResponseDto response = billingService.getInvoiceById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<InvoiceResponseDto>> getAllInvoices() {
        List<InvoiceResponseDto> response = billingService.getAllInvoices();
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<InvoiceResponseDto> cancelInvoice(@PathVariable UUID id) {
        InvoiceResponseDto response = billingService.cancelInvoice(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<?> getInvoicePdf(@PathVariable UUID id) {
        InvoiceResponseDto response = billingService.getInvoiceById(id);
        
        // If S3 is not configured or failed, serve the PDF dynamically from backend bytes
        if (response.getPdfUrl() == null || response.getPdfUrl().contains("mock-s3-storage.com")) {
            byte[] pdfBytes = billingService.generateInvoicePdfBytes(id);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=" + response.getInvoiceNumber() + ".pdf")
                    .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                    .body(pdfBytes);
        }
        
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, response.getPdfUrl())
                .build();
    }
}
