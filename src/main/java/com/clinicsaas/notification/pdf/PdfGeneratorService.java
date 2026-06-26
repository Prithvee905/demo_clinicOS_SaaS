package com.clinicsaas.notification.pdf;

import com.clinicsaas.billing.dto.InvoiceResponseDto;
import com.clinicsaas.billing.dto.InvoiceItemDto;
import com.lowagie.text.Document;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;
import java.io.ByteArrayOutputStream;

@Service
public class PdfGeneratorService {

    public byte[] generateInvoicePdf(InvoiceResponseDto invoice, String patientName) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document();
            PdfWriter.getInstance(document, out);
            document.open();
            
            document.add(new Paragraph("CLINIC BILLING SYSTEM"));
            document.add(new Paragraph("======================================="));
            document.add(new Paragraph("Invoice Number: " + invoice.getInvoiceNumber()));
            document.add(new Paragraph("Patient: " + patientName));
            document.add(new Paragraph("Date: " + invoice.getCreatedAt()));
            document.add(new Paragraph("Status: " + invoice.getStatus()));
            document.add(new Paragraph("---------------------------------------"));
            
            for (InvoiceItemDto item : invoice.getItems()) {
                document.add(new Paragraph(String.format("%s (x%d) - Rs. %.2f", 
                        item.getItemName(), item.getQuantity(), item.getUnitPrice())));
            }
            
            document.add(new Paragraph("---------------------------------------"));
            document.add(new Paragraph(String.format("Grand Total: Rs. %.2f", invoice.getTotalAmount())));
            document.add(new Paragraph("======================================="));
            document.add(new Paragraph("Thank you for choosing ClinicOS!"));
            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate invoice PDF", e);
        }
    }
}
