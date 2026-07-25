package com.clinicsaas.billing.service;

import com.clinicsaas.billing.repository.InvoiceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.UUID;

@Service
public class InvoiceNumberGenerator {

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Transactional(readOnly = true)
    public String generateNextInvoiceNumber(UUID clinicId) {
        int year = LocalDate.now().getYear();
        String prefix = "INV-" + year + "-";
        
        String maxInvoiceNumber = invoiceRepository.findMaxInvoiceNumberByPrefix(prefix + "%");
        
        int nextSequence = 1;
        if (maxInvoiceNumber != null && maxInvoiceNumber.length() > prefix.length()) {
            try {
                String sequenceStr = maxInvoiceNumber.substring(prefix.length());
                nextSequence = Integer.parseInt(sequenceStr) + 1;
            } catch (NumberFormatException e) {
                // Ignore and fallback to 1
            }
        }
        
        return prefix + String.format("%06d", nextSequence);
    }
}
