package com.clinicsaas.prescription.repository;

import com.clinicsaas.prescription.domain.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PrescriptionRepository extends JpaRepository<Prescription, UUID> {

    Optional<Prescription> findByIdAndClinicId(UUID id, UUID clinicId);

    List<Prescription> findByClinicId(UUID clinicId);

    List<Prescription> findByPatientIdAndClinicId(UUID patientId, UUID clinicId);

    long countByClinicIdAndStatus(UUID clinicId, String status);

    long countByClinicId(UUID clinicId);
}
