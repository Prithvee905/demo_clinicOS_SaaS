package com.clinicsaas.patient.repository;

import com.clinicsaas.patient.domain.Patient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PatientRepository extends JpaRepository<Patient, UUID> {

    Optional<Patient> findByIdAndClinicIdAndStatus(UUID id, UUID clinicId, String status);

    boolean existsByClinicIdAndPhoneAndStatus(UUID clinicId, String phone, String status);

    @Query("SELECT p FROM Patient p WHERE p.clinicId = :clinicId AND p.status = 'ACTIVE' AND " +
           "(CAST(:search AS string) IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) OR p.phone LIKE CONCAT('%', CAST(:search AS string), '%'))")
    Page<Patient> searchPatients(@Param("clinicId") UUID clinicId, @Param("search") String search, Pageable pageable);

    @Query("SELECT COUNT(p) FROM Patient p WHERE p.clinicId = :clinicId AND p.status = 'ACTIVE'")
    long countByClinicId(@Param("clinicId") UUID clinicId);
}
