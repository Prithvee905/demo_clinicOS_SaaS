package com.clinicsaas.notification.listener;

import com.clinicsaas.billing.domain.Invoice;
import com.clinicsaas.billing.repository.InvoiceRepository;
import com.clinicsaas.common.tenant.TenantContext;
import com.clinicsaas.event.InvoiceCreatedEvent;
import com.clinicsaas.file.domain.FileRecord;
import com.clinicsaas.file.repository.FileRecordRepository;
import com.clinicsaas.notification.pdf.PdfGeneratorService;
import com.clinicsaas.notification.pdf.S3StorageService;
import com.clinicsaas.notification.whatsapp.WhatsAppSenderService;
import com.clinicsaas.billing.dto.InvoiceResponseDto;
import com.clinicsaas.billing.dto.InvoiceItemDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class InvoiceNotificationListener {

    private static final Logger log = LoggerFactory.getLogger(InvoiceNotificationListener.class);

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private PdfGeneratorService pdfGeneratorService;

    @Autowired
    private S3StorageService s3StorageService;

    @Autowired
    private FileRecordRepository fileRecordRepository;

    @Autowired
    private WhatsAppSenderService whatsAppSenderService;


    @Async("virtualThreadExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleInvoiceCreated(InvoiceCreatedEvent event) {
        log.info("Processing InvoiceCreatedEvent asynchronously in background for invoice: {}", event.getInvoiceId());
        
        try {
            // 1. Rebind TenantContext to this background thread
            TenantContext.setTenantId(event.getClinicId().toString());
            TenantContext.setUserId(event.getUserId().toString());

            // 2. Fetch invoice and verify it is ready for processing (Idempotency / State Check)
            Invoice invoice = invoiceRepository.findById(event.getInvoiceId()).orElse(null);
            if (invoice == null) {
                log.warn("Invoice {} not found inside background listener.", event.getInvoiceId());
                return;
            }

            if (!"PENDING".equals(invoice.getStatus())) {
                log.info("Invoice {} has status '{}', skipping background PDF/S3 processing (idempotency check).", 
                        invoice.getId(), invoice.getStatus());
                return;
            }

            // Move status to PROCESSING (Idempotency guard)
            invoice.setStatus("PROCESSING");
            invoice = invoiceRepository.save(invoice);

            try {
                // 3. Compile PDF in-memory
                InvoiceResponseDto dto = mapToDto(invoice);
                byte[] pdfBytes = pdfGeneratorService.generateInvoicePdf(
                        dto, 
                        invoice.getPatient().getName(), 
                        invoice.getPrescription().getDoctor().getName()
                );

                // 4. Upload PDF to S3 (this handles Resilience4j retries internally)
                String key = String.format("%s/invoices/%s.pdf", event.getClinicId(), invoice.getInvoiceNumber());
                String s3Url = s3StorageService.uploadAndPresign(key, pdfBytes);

                // 5. Save File Record
                FileRecord fileRecord = new FileRecord();
                fileRecord.setClinicId(event.getClinicId());
                fileRecord.setFileName(invoice.getInvoiceNumber() + ".pdf");
                fileRecord.setFileType("application/pdf");
                fileRecord.setS3Key(key);
                fileRecord.setUrl(s3Url);
                fileRecord.setUploadedBy(event.getUserId());
                fileRecord = fileRecordRepository.save(fileRecord);

                // 6. Update Invoice with File mapping and status GENERATED
                invoice.setFile(fileRecord);
                invoice.setStatus("GENERATED");
                invoice = invoiceRepository.save(invoice);

                log.info("Invoice {} successfully generated and stored in S3.", invoice.getId());

                // 7. Auto-notify patient on WhatsApp
                whatsAppSenderService.sendInvoiceNotification(invoice.getId());

            } catch (Exception e) {
                log.error("Failed to generate or upload invoice " + invoice.getInvoiceNumber() + " in background.", e);
                // Transition to FAILED state
                invoice.setStatus("FAILED");
                invoiceRepository.save(invoice);
            }

        } finally {
            // Always clear the thread context
            TenantContext.clear();
        }
    }

    private InvoiceResponseDto mapToDto(Invoice inv) {
        InvoiceResponseDto dto = new InvoiceResponseDto();
        dto.setId(inv.getId());
        dto.setClinicId(inv.getClinicId());
        dto.setInvoiceNumber(inv.getInvoiceNumber());
        dto.setPatientId(inv.getPatient().getId());
        dto.setPatientName(inv.getPatient().getName());
        dto.setPatientPhone(inv.getPatient().getPhone());
        dto.setPrescriptionId(inv.getPrescription().getId());
        dto.setSubtotal(inv.getSubtotal());
        dto.setTaxAmount(inv.getTaxAmount());
        dto.setGrandTotal(inv.getGrandTotal());
        dto.setPdfUrl(inv.getFile() != null ? inv.getFile().getUrl() : null);
        dto.setStatus(inv.getStatus());
        dto.setVersion(inv.getVersion());
        dto.setCreatedAt(inv.getCreatedAt());
        dto.setUpdatedAt(inv.getUpdatedAt());

        List<InvoiceItemDto> itemDtos = inv.getItems().stream()
                .map(item -> new InvoiceItemDto(
                        item.getItemName(),
                        item.getQuantity(),
                        item.getUnitPrice(),
                        item.getTax(),
                        item.getTotalPrice()
                ))
                .collect(Collectors.toList());
        dto.setItems(itemDtos);

        return dto;
    }
}
