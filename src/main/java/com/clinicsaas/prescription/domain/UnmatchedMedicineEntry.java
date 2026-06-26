package com.clinicsaas.prescription.domain;

import com.clinicsaas.common.tenant.BaseTenantEntity;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "unmatched_medicine_entries")
public class UnmatchedMedicineEntry extends BaseTenantEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "name_entered", nullable = false)
    private String nameEntered;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getNameEntered() {
        return nameEntered;
    }

    public void setNameEntered(String nameEntered) {
        this.nameEntered = nameEntered;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
