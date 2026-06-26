package com.clinicsaas.auth.repository;

import com.clinicsaas.auth.domain.Clinic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClinicRepository extends JpaRepository<Clinic, UUID> {
    Optional<Clinic> findByCode(String code);
}
