package com.clinicsaas.doctor.repository;

import com.clinicsaas.doctor.domain.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DoctorRepository extends JpaRepository<Doctor, UUID> {

    Optional<Doctor> findByIdAndClinicIdAndStatus(UUID id, UUID clinicId, String status);

    List<Doctor> findByClinicIdAndStatus(UUID clinicId, String status);

    long countByClinicIdAndStatus(UUID clinicId, String status);

    Optional<Doctor> findByUserIdAndClinicIdAndStatus(UUID userId, UUID clinicId, String status);

    Optional<Doctor> findByUserIdAndClinicId(UUID userId, UUID clinicId);
}
