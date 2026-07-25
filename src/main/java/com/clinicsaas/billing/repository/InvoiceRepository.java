package com.clinicsaas.billing.repository;

import com.clinicsaas.billing.domain.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    Optional<Invoice> findByIdAndClinicId(UUID id, UUID clinicId);

    List<Invoice> findByClinicId(UUID clinicId);

    Optional<Invoice> findByInvoiceNumberAndClinicId(String invoiceNumber, UUID clinicId);

    @Query("SELECT MAX(i.invoiceNumber) FROM Invoice i WHERE i.clinicId = :clinicId AND i.invoiceNumber LIKE :prefixPattern")
    String findMaxInvoiceNumberByClinicIdAndPrefix(@Param("clinicId") UUID clinicId, @Param("prefixPattern") String prefixPattern);

    @Query("SELECT MAX(i.invoiceNumber) FROM Invoice i WHERE i.invoiceNumber LIKE :prefixPattern")
    String findMaxInvoiceNumberByPrefix(@Param("prefixPattern") String prefixPattern);

    long countByClinicIdAndStatus(UUID clinicId, String status);

    long countByClinicId(UUID clinicId);
}
