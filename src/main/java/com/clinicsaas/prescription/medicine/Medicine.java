package com.clinicsaas.prescription.medicine;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "medicines")
public class Medicine {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(name = "generic_composition")
    private String genericComposition;

    @Column(name = "dosage_form")
    private String dosageForm;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getGenericComposition() {
        return genericComposition;
    }

    public void setGenericComposition(String genericComposition) {
        this.genericComposition = genericComposition;
    }

    public String getDosageForm() {
        return dosageForm;
    }

    public void setDosageForm(String dosageForm) {
        this.dosageForm = dosageForm;
    }
}
