package com.clinicsaas.prescription.medicine;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface MedicineRepository extends JpaRepository<Medicine, UUID> {

    @Query(value = "SELECT * FROM medicines " +
                   "WHERE name ILIKE %:query% OR similarity(name, :query) > 0.3 " +
                   "ORDER BY similarity(name, :query) DESC LIMIT 10", nativeQuery = true)
    List<Medicine> searchMedicines(@Param("query") String query);

    boolean existsByNameIgnoreCase(String name);
}
