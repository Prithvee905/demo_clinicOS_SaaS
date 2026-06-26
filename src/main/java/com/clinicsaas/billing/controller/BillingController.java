package com.clinicsaas.billing.controller;

import com.clinicsaas.billing.dto.InvoiceRequestDto;
import com.clinicsaas.billing.dto.InvoiceResponseDto;
import com.clinicsaas.billing.service.BillingService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/invoices")
public class BillingController {

    @Autowired
    private BillingService billingService;

    @PostMapping
    public ResponseEntity<InvoiceResponseDto> createInvoice(@Valid @RequestBody InvoiceRequestDto dto) {
        InvoiceResponseDto response = billingService.createInvoice(dto);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<InvoiceResponseDto> getInvoiceById(@PathVariable UUID id) {
        InvoiceResponseDto response = billingService.getInvoiceById(id);
        return ResponseEntity.ok(response);
    }
}
