package com.clinicsaas.billing.service;

import com.clinicsaas.billing.domain.Invoice;
import com.clinicsaas.billing.domain.InvoiceItem;
import com.clinicsaas.billing.domain.Payment;
import com.clinicsaas.billing.dto.InvoiceItemDto;
import com.clinicsaas.billing.dto.InvoiceRequestDto;
import com.clinicsaas.billing.dto.InvoiceResponseDto;
import com.clinicsaas.billing.repository.InvoiceRepository;
import com.clinicsaas.common.exception.CustomException;
import com.clinicsaas.common.tenant.TenantContext;
import com.clinicsaas.event.InvoiceCreatedEvent;
import com.clinicsaas.patient.dto.PatientResponseDto;
import com.clinicsaas.patient.service.PatientService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class BillingService {

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private PatientService patientService;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @Transactional
    public InvoiceResponseDto createInvoice(InvoiceRequestDto dto) {
        // Validate patient exists (cross-module call via service interface)
        PatientResponseDto patient = patientService.getPatientById(dto.getPatientId());

        Invoice invoice = new Invoice();
        invoice.setPatientId(patient.getId());
        invoice.setInvoiceNumber("INV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        invoice.setDeliveryStatus("PENDING");
        invoice.setCreatedAt(LocalDateTime.now());

        BigDecimal grandTotal = BigDecimal.ZERO;
        for (InvoiceItemDto itemDto : dto.getItems()) {
            InvoiceItem item = new InvoiceItem();
            item.setItemName(itemDto.getItemName());
            item.setQuantity(itemDto.getQuantity());
            item.setUnitPrice(itemDto.getUnitPrice());
            BigDecimal amount = itemDto.getUnitPrice().multiply(BigDecimal.valueOf(itemDto.getQuantity()));
            item.setAmount(amount);
            
            grandTotal = grandTotal.add(amount);
            invoice.addItem(item);
        }
        invoice.setTotalAmount(grandTotal);

        if (dto.getPaymentMethod() != null && !dto.getPaymentMethod().isBlank()) {
            invoice.setStatus("PAID");
            Payment payment = new Payment();
            payment.setAmount(grandTotal);
            payment.setPaymentMethod(dto.getPaymentMethod());
            payment.setPaidAt(LocalDateTime.now());
            invoice.addPayment(payment);
        } else {
            invoice.setStatus("UNPAID");
        }

        invoice = invoiceRepository.save(invoice);

        // Publish event for async worker
        String tenantId = TenantContext.getTenantId();
        if (tenantId != null) {
            eventPublisher.publishEvent(new InvoiceCreatedEvent(invoice.getId(), UUID.fromString(tenantId)));
        }

        return mapToDto(invoice);
    }

    @Transactional(readOnly = true)
    public InvoiceResponseDto getInvoiceById(UUID id) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new CustomException("Invoice not found", HttpStatus.NOT_FOUND));
        return mapToDto(invoice);
    }

    @Transactional
    public void updateDeliveryStatus(UUID invoiceId, String deliveryStatus, String pdfUrl) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new CustomException("Invoice not found", HttpStatus.NOT_FOUND));
        invoice.setDeliveryStatus(deliveryStatus);
        if (pdfUrl != null) {
            invoice.setPdfUrl(pdfUrl);
        }
        invoiceRepository.save(invoice);
    }

    private InvoiceResponseDto mapToDto(Invoice invoice) {
        InvoiceResponseDto dto = new InvoiceResponseDto();
        dto.setId(invoice.getId());
        dto.setPatientId(invoice.getPatientId());
        dto.setInvoiceNumber(invoice.getInvoiceNumber());
        dto.setTotalAmount(invoice.getTotalAmount());
        dto.setStatus(invoice.getStatus());
        dto.setDeliveryStatus(invoice.getDeliveryStatus());
        dto.setPdfUrl(invoice.getPdfUrl());
        dto.setCreatedAt(invoice.getCreatedAt());

        List<InvoiceItemDto> itemDtos = invoice.getItems().stream()
                .map(item -> new InvoiceItemDto(
                        item.getItemName(),
                        item.getQuantity(),
                        item.getUnitPrice()
                ))
                .collect(Collectors.toList());
        dto.setItems(itemDtos);

        return dto;
    }
}
