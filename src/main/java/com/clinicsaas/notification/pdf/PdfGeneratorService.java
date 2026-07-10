package com.clinicsaas.notification.pdf;

import com.clinicsaas.auth.domain.Clinic;
import com.clinicsaas.auth.repository.ClinicRepository;
import com.clinicsaas.billing.dto.InvoiceResponseDto;
import com.clinicsaas.billing.dto.InvoiceItemDto;
import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;

@Service
public class PdfGeneratorService {

    @Autowired
    private ClinicRepository clinicRepository;

    public byte[] generateInvoicePdf(InvoiceResponseDto invoice, String patientName, String doctorName) {
        // Fetch active clinic details
        Clinic clinic = clinicRepository.findById(invoice.getClinicId()).orElse(null);
        String clinicName = clinic != null ? clinic.getName() : "ClinicOS Care Center";
        String clinicPhone = clinic != null ? clinic.getPhone() : "N/A";
        String clinicEmail = clinic != null ? clinic.getEmail() : "N/A";
        String clinicAddr = clinic != null ? clinic.getAddress() : "N/A";

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 36, 36);
            PdfWriter.getInstance(document, out);
            document.open();
            
            // Fonts
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22);
            Font headingFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
            Font regularFont = FontFactory.getFont(FontFactory.HELVETICA, 10);
            Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);

            // 1. Header (Clinic Information)
            Paragraph header = new Paragraph(clinicName.toUpperCase(), titleFont);
            header.setAlignment(Element.ALIGN_CENTER);
            document.add(header);
            
            Paragraph subHeader = new Paragraph(String.format("Address: %s | Phone: %s | Email: %s", clinicAddr, clinicPhone, clinicEmail), regularFont);
            subHeader.setAlignment(Element.ALIGN_CENTER);
            subHeader.setSpacingAfter(20);
            document.add(subHeader);

            // Divider Line
            document.add(new Paragraph("----------------------------------------------------------------------------------------------------------------------------------", regularFont));

            // 2. Info Block (Invoice Details, Patient, Doctor)
            PdfPTable infoTable = new PdfPTable(2);
            infoTable.setWidthPercentage(100);
            infoTable.setSpacingBefore(10);
            infoTable.setSpacingAfter(20);

            // Column 1: Patient & Doctor Info
            PdfPCell cell1 = new PdfPCell();
            cell1.setBorder(Rectangle.NO_BORDER);
            cell1.addElement(new Paragraph("PATIENT DETAILS:", headingFont));
            cell1.addElement(new Paragraph("Name: " + patientName, regularFont));
            cell1.addElement(new Paragraph("Phone: " + invoice.getPatientPhone(), regularFont));
            cell1.addElement(new Paragraph("Consulting Doctor: Dr. " + doctorName, regularFont));
            infoTable.addCell(cell1);

            // Column 2: Invoice Details
            PdfPCell cell2 = new PdfPCell();
            cell2.setBorder(Rectangle.NO_BORDER);
            cell2.setHorizontalAlignment(Element.ALIGN_RIGHT);
            cell2.addElement(new Paragraph("INVOICE DETAILS:", headingFont));
            cell2.addElement(new Paragraph("Invoice No: " + invoice.getInvoiceNumber(), boldFont));
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            cell2.addElement(new Paragraph("Date: " + invoice.getCreatedAt().format(formatter), regularFont));
            cell2.addElement(new Paragraph("Status: " + invoice.getStatus(), boldFont));
            infoTable.addCell(cell2);

            document.add(infoTable);

            // 3. Billing Table
            PdfPTable table = new PdfPTable(5);
            table.setWidthPercentage(100);
            table.setSpacingBefore(10);
            table.setSpacingAfter(10);
            table.setWidths(new int[]{4, 1, 2, 2, 2});

            // Headers
            table.addCell(new PdfPCell(new Paragraph("Item Description", boldFont)));
            table.addCell(new PdfPCell(new Paragraph("Qty", boldFont)));
            table.addCell(new PdfPCell(new Paragraph("Unit Price (INR)", boldFont)));
            table.addCell(new PdfPCell(new Paragraph("Tax (INR)", boldFont)));
            table.addCell(new PdfPCell(new Paragraph("Total (INR)", boldFont)));

            // Rows
            for (InvoiceItemDto item : invoice.getItems()) {
                table.addCell(new PdfPCell(new Paragraph(item.getItemName(), regularFont)));
                table.addCell(new PdfPCell(new Paragraph(String.valueOf(item.getQuantity()), regularFont)));
                table.addCell(new PdfPCell(new Paragraph(String.format("%.2f", item.getUnitPrice()), regularFont)));
                table.addCell(new PdfPCell(new Paragraph(String.format("%.2f", item.getTax()), regularFont)));
                table.addCell(new PdfPCell(new Paragraph(String.format("%.2f", item.getTotalPrice()), regularFont)));
            }
            document.add(table);

            // 4. Summary Totals Table
            PdfPTable summaryTable = new PdfPTable(2);
            summaryTable.setWidthPercentage(40);
            summaryTable.setHorizontalAlignment(Element.ALIGN_RIGHT);
            summaryTable.setSpacingBefore(10);
            summaryTable.setWidths(new int[]{1, 1});

            summaryTable.addCell(new PdfPCell(new Paragraph("Subtotal:", regularFont)));
            summaryTable.addCell(new PdfPCell(new Paragraph("INR " + String.format("%.2f", invoice.getSubtotal()), regularFont)));

            summaryTable.addCell(new PdfPCell(new Paragraph("Tax Amount:", regularFont)));
            summaryTable.addCell(new PdfPCell(new Paragraph("INR " + String.format("%.2f", invoice.getTaxAmount()), regularFont)));

            PdfPCell grandCell = new PdfPCell(new Paragraph("Grand Total:", boldFont));
            grandCell.setBackgroundColor(java.awt.Color.LIGHT_GRAY);
            summaryTable.addCell(grandCell);

            PdfPCell grandValCell = new PdfPCell(new Paragraph("INR " + String.format("%.2f", invoice.getGrandTotal()), boldFont));
            grandValCell.setBackgroundColor(java.awt.Color.LIGHT_GRAY);
            summaryTable.addCell(grandValCell);

            document.add(summaryTable);

            // 5. Footer Notes
            Paragraph footer = new Paragraph("\n\nThank you for choosing " + clinicName + "!\nPowered by ClinicOS", regularFont);
            footer.setAlignment(Element.ALIGN_CENTER);
            document.add(footer);

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate professional invoice PDF", e);
        }
    }
}
