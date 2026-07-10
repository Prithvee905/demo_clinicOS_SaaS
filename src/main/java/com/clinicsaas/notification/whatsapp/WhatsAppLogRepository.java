package com.clinicsaas.notification.whatsapp;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface WhatsAppLogRepository extends JpaRepository<WhatsAppLog, UUID> {
    List<WhatsAppLog> findByInvoiceIdAndClinicId(UUID invoiceId, UUID clinicId);
    List<WhatsAppLog> findByClinicId(UUID clinicId);
}
