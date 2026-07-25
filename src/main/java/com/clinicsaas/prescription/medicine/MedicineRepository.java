package com.clinicsaas.prescription.medicine;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MedicineRepository extends JpaRepository<Medicine, UUID> {

    Optional<Medicine> findByIdAndClinicIdAndStatus(UUID id, UUID clinicId, String status);

    boolean existsByClinicIdAndMedicineCodeAndStatus(UUID clinicId, String medicineCode, String status);

    boolean existsByClinicIdAndMedicineNameIgnoreCaseAndStatus(UUID clinicId, String medicineName, String status);

    @Query(value = "SELECT * FROM medicines " +
                   "WHERE clinic_id = CAST(:clinicId AS uuid) AND status = 'ACTIVE' AND " +
                   "(medicine_name ILIKE CONCAT('%', CAST(:query AS text), '%') OR similarity(medicine_name, CAST(:query AS text)) > 0.1) " +
                   "ORDER BY similarity(medicine_name, CAST(:query AS text)) DESC LIMIT 15", nativeQuery = true)
    List<Medicine> searchMedicines(@Param("clinicId") UUID clinicId, @Param("query") String query);

    @Query("SELECT m FROM Medicine m WHERE m.clinicId = :clinicId AND m.status = 'ACTIVE' AND " +
           "(CAST(:search AS string) IS NULL OR LOWER(m.medicineName) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) OR LOWER(m.medicineCode) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')))")
    Page<Medicine> searchMedicinesPaged(@Param("clinicId") UUID clinicId, @Param("search") String search, Pageable pageable);

    @Query("SELECT COUNT(m) FROM Medicine m WHERE m.clinicId = :clinicId AND m.status = 'ACTIVE'")
    long countByClinicId(@Param("clinicId") UUID clinicId);
}
