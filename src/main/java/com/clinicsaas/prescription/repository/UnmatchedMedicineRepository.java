package com.clinicsaas.prescription.repository;

import com.clinicsaas.prescription.domain.UnmatchedMedicineEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface UnmatchedMedicineRepository extends JpaRepository<UnmatchedMedicineEntry, UUID> {
}
