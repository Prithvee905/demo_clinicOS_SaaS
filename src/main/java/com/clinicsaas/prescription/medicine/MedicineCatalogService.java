package com.clinicsaas.prescription.medicine;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class MedicineCatalogService {

    private static final Logger log = LoggerFactory.getLogger(MedicineCatalogService.class);

    @Autowired
    private MedicineRepository medicineRepository;

    @Transactional(readOnly = true)
    @Cacheable(value = "medicine_search", key = "#query.toLowerCase().trim()")
    public List<Medicine> search(String query) {
        log.info("Cache miss for search query '{}'. Fetching from database...", query);
        return medicineRepository.searchMedicines(query);
    }

    @Transactional
    @CacheEvict(value = "medicine_search", allEntries = true)
    public Medicine addMedicine(Medicine medicine) {
        log.info("Evicting medicine search caches due to catalog write: {}", medicine.getName());
        return medicineRepository.save(medicine);
    }

    @Transactional(readOnly = true)
    public boolean existsByName(String name) {
        return medicineRepository.existsByNameIgnoreCase(name);
    }
}
