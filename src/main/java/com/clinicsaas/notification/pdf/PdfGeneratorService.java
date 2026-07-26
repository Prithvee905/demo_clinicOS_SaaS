package com.clinicsaas.notification.pdf;

import com.clinicsaas.auth.domain.Clinic;
import com.clinicsaas.auth.repository.ClinicRepository;
import com.clinicsaas.billing.dto.InvoiceResponseDto;
import com.clinicsaas.billing.dto.InvoiceItemDto;
import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.awt.Color;

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
            // A4 Page with 40pt side margins, 40pt top/bottom margins
            Document document = new Document(PageSize.A4, 40, 40, 40, 40);
            PdfWriter.getInstance(document, out);
            document.open();
            
            // Brand Color Palette (Violet brand match)
            Color brandPrimary = new Color(99, 102, 241);     // Violet (#6366f1)
            Color textDark = new Color(15, 23, 42);          // Slate Dark (#0f172a)
            Color textMuted = new Color(71, 85, 105);        // Slate Muted (#475569)
            Color bgHeader = new Color(248, 250, 252);       // Very Light Slate (#f8fafc)
            Color borderLight = new Color(226, 232, 240);    // Light Border (#e2e8f0)

            // Fonts
            Font logoFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 24, brandPrimary);
            Font clinicTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, textDark);
            Font infoValueFont = FontFactory.getFont(FontFactory.HELVETICA, 10, textDark);
            Font headingFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, brandPrimary);
            Font tableHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE);
            Font tableRowFont = FontFactory.getFont(FontFactory.HELVETICA, 9, textDark);
            Font tableRowBoldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, textDark);
            Font footerFont = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 8, textMuted);

            // 1. HEADER BRANDING BLOCK (Two Column Header)
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            headerTable.setWidths(new int[]{6, 4});

            // Clinic details (Left side)
            PdfPCell clinicCell = new PdfPCell();
            clinicCell.setBorder(Rectangle.NO_BORDER);
            clinicCell.addElement(new Paragraph(clinicName, clinicTitleFont));
            Paragraph addrPara = new Paragraph(clinicAddr, FontFactory.getFont(FontFactory.HELVETICA, 9, textMuted));
            addrPara.setSpacingBefore(3);
            clinicCell.addElement(addrPara);
            
            Paragraph contactPara = new Paragraph(String.format("Phone: %s | Email: %s", clinicPhone, clinicEmail), FontFactory.getFont(FontFactory.HELVETICA, 9, textMuted));
            contactPara.setSpacingBefore(2);
            clinicCell.addElement(contactPara);
            headerTable.addCell(clinicCell);

            // Invoice Header / Brand Logo (Right side)
            PdfPCell logoCell = new PdfPCell();
            logoCell.setBorder(Rectangle.NO_BORDER);
            logoCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            
            Paragraph logoText = new Paragraph("ClinicOS", logoFont);
            logoText.setAlignment(Element.ALIGN_RIGHT);
            logoCell.addElement(logoText);
            
            Paragraph docText = new Paragraph("TAX INVOICE / RECEIPT", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, textMuted));
            docText.setAlignment(Element.ALIGN_RIGHT);
            docText.setSpacingBefore(3);
            logoCell.addElement(docText);
            headerTable.addCell(logoCell);

            document.add(headerTable);

            // Colored accent line divider
            PdfPTable dividerLine = new PdfPTable(1);
            dividerLine.setWidthPercentage(100);
            dividerLine.setSpacingBefore(15);
            dividerLine.setSpacingAfter(15);
            PdfPCell lineCell = new PdfPCell();
            lineCell.setBackgroundColor(brandPrimary);
            lineCell.setFixedHeight(2);
            lineCell.setBorder(Rectangle.NO_BORDER);
            dividerLine.addCell(lineCell);
            document.add(dividerLine);

            // 2. TWO-COLUMN METADATA BLOCK (Patient Info vs Invoice Metadata)
            PdfPTable metaTable = new PdfPTable(2);
            metaTable.setWidthPercentage(100);
            metaTable.setSpacingAfter(20);
            metaTable.setWidths(new int[]{5, 5});

            // Left Block: Bill To
            PdfPCell patientCell = new PdfPCell();
            patientCell.setBorder(Rectangle.NO_BORDER);
            patientCell.setPaddingRight(10);
            
            Paragraph billToHeader = new Paragraph("BILL TO:", headingFont);
            billToHeader.setSpacingAfter(5);
            patientCell.addElement(billToHeader);
            
            patientCell.addElement(new Paragraph("Patient Name: " + patientName, infoValueFont));
            patientCell.addElement(new Paragraph("Phone: " + invoice.getPatientPhone(), infoValueFont));
            patientCell.addElement(new Paragraph("Consulting: Dr. " + doctorName, infoValueFont));
            metaTable.addCell(patientCell);

            // Right Block: Invoice Details
            PdfPCell invMetaCell = new PdfPCell();
            invMetaCell.setBorder(Rectangle.NO_BORDER);
            invMetaCell.setPaddingLeft(10);
            
            Paragraph detailsHeader = new Paragraph("INVOICE METADATA:", headingFont);
            detailsHeader.setSpacingAfter(5);
            invMetaCell.addElement(detailsHeader);
            
            invMetaCell.addElement(new Paragraph("Invoice Number: " + invoice.getInvoiceNumber(), infoValueFont));
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            invMetaCell.addElement(new Paragraph("Date Generated: " + invoice.getCreatedAt().format(formatter), infoValueFont));
            invMetaCell.addElement(new Paragraph("Payment Status: " + invoice.getStatus(), infoValueFont));
            metaTable.addCell(invMetaCell);

            document.add(metaTable);

            // 3. PREMIUM BILLING ITEMS TABLE
            PdfPTable itemsTable = new PdfPTable(5);
            itemsTable.setWidthPercentage(100);
            itemsTable.setSpacingBefore(10);
            itemsTable.setSpacingAfter(15);
            itemsTable.setWidths(new int[]{4, 1, 2, 2, 2});

            // Header cells with brandPrimary background and white text
            String[] headers = {"Item Description", "Qty", "Unit Price (INR)", "Tax (GST)", "Total (INR)"};
            for (String headerText : headers) {
                PdfPCell cell = new PdfPCell(new Paragraph(headerText, tableHeaderFont));
                cell.setBackgroundColor(brandPrimary);
                cell.setBorderColor(brandPrimary);
                cell.setPadding(8);
                cell.setHorizontalAlignment(headerText.equals("Item Description") ? Element.ALIGN_LEFT : Element.ALIGN_RIGHT);
                itemsTable.addCell(cell);
            }

            // Populate rows with alternating colors
            boolean isAlternate = false;
            for (InvoiceItemDto item : invoice.getItems()) {
                Color cellBg = isAlternate ? bgHeader : Color.WHITE;
                
                PdfPCell nameCell = new PdfPCell(new Paragraph(item.getItemName(), tableRowFont));
                nameCell.setBackgroundColor(cellBg);
                nameCell.setBorderColor(borderLight);
                nameCell.setPadding(7);
                itemsTable.addCell(nameCell);

                PdfPCell qtyCell = new PdfPCell(new Paragraph(String.valueOf(item.getQuantity()), tableRowFont));
                qtyCell.setBackgroundColor(cellBg);
                qtyCell.setBorderColor(borderLight);
                qtyCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                qtyCell.setPadding(7);
                itemsTable.addCell(qtyCell);

                PdfPCell priceCell = new PdfPCell(new Paragraph(String.format("%.2f", item.getUnitPrice()), tableRowFont));
                priceCell.setBackgroundColor(cellBg);
                priceCell.setBorderColor(borderLight);
                priceCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                priceCell.setPadding(7);
                itemsTable.addCell(priceCell);

                PdfPCell taxCell = new PdfPCell(new Paragraph(String.format("%.2f", item.getTax()), tableRowFont));
                taxCell.setBackgroundColor(cellBg);
                taxCell.setBorderColor(borderLight);
                taxCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                taxCell.setPadding(7);
                itemsTable.addCell(taxCell);

                PdfPCell totalCell = new PdfPCell(new Paragraph(String.format("%.2f", item.getTotalPrice()), tableRowFont));
                totalCell.setBackgroundColor(cellBg);
                totalCell.setBorderColor(borderLight);
                totalCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                totalCell.setPadding(7);
                itemsTable.addCell(totalCell);

                isAlternate = !isAlternate;
            }
            document.add(itemsTable);

            // 4. SUMMARY / TOTALS CALCULATION BOX
            PdfPTable summaryTable = new PdfPTable(2);
            summaryTable.setWidthPercentage(45);
            summaryTable.setHorizontalAlignment(Element.ALIGN_RIGHT);
            summaryTable.setSpacingBefore(5);
            summaryTable.setWidths(new int[]{6, 4});

            // Subtotal
            PdfPCell subLabel = new PdfPCell(new Paragraph("Subtotal:", tableRowFont));
            subLabel.setBorder(Rectangle.NO_BORDER);
            subLabel.setPadding(4);
            summaryTable.addCell(subLabel);
            PdfPCell subVal = new PdfPCell(new Paragraph("INR " + String.format("%.2f", invoice.getSubtotal()), tableRowFont));
            subVal.setBorder(Rectangle.NO_BORDER);
            subVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
            subVal.setPadding(4);
            summaryTable.addCell(subVal);

            // Tax
            PdfPCell taxLabel = new PdfPCell(new Paragraph("Tax (GST):", tableRowFont));
            taxLabel.setBorder(Rectangle.NO_BORDER);
            taxLabel.setPadding(4);
            summaryTable.addCell(taxLabel);
            PdfPCell taxVal = new PdfPCell(new Paragraph("INR " + String.format("%.2f", invoice.getTaxAmount()), tableRowFont));
            taxVal.setBorder(Rectangle.NO_BORDER);
            taxVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
            taxVal.setPadding(4);
            summaryTable.addCell(taxVal);

            // Divider row in summary table
            PdfPCell blankLabel = new PdfPCell();
            blankLabel.setBorder(Rectangle.BOTTOM);
            blankLabel.setBorderColor(borderLight);
            blankLabel.setFixedHeight(5);
            summaryTable.addCell(blankLabel);
            PdfPCell blankVal = new PdfPCell();
            blankVal.setBorder(Rectangle.BOTTOM);
            blankVal.setBorderColor(borderLight);
            blankVal.setFixedHeight(5);
            summaryTable.addCell(blankVal);

            // Grand Total (Highlighted block)
            PdfPCell grandLabel = new PdfPCell(new Paragraph("Grand Total:", tableRowBoldFont));
            grandLabel.setBorder(Rectangle.NO_BORDER);
            grandLabel.setPadding(8);
            grandLabel.setBackgroundColor(bgHeader);
            summaryTable.addCell(grandLabel);
            
            PdfPCell grandVal = new PdfPCell(new Paragraph("INR " + String.format("%.2f", invoice.getGrandTotal()), tableHeaderFont));
            grandVal.setBackgroundColor(brandPrimary);
            grandVal.setBorderColor(brandPrimary);
            grandVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
            grandVal.setPadding(8);
            summaryTable.addCell(grandVal);

            document.add(summaryTable);

            // 5. PROFESSIONAL STYLISH FOOTER
            Paragraph disclaimer = new Paragraph("\n\n\n\n* This is a computer-generated document and does not require a physical signature.", footerFont);
            disclaimer.setAlignment(Element.ALIGN_CENTER);
            document.add(disclaimer);
            
            Paragraph footer = new Paragraph("Thank you for choosing " + clinicName + "! | Powered by ClinicOS", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, textMuted));
            footer.setSpacingBefore(5);
            footer.setAlignment(Element.ALIGN_CENTER);
            document.add(footer);

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate professional invoice PDF", e);
        }
    }
}
