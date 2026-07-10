package com.clinicsaas.file.repository;

import com.clinicsaas.file.domain.FileRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FileRecordRepository extends JpaRepository<FileRecord, UUID> {
    Optional<FileRecord> findByIdAndClinicId(UUID id, UUID clinicId);
}
