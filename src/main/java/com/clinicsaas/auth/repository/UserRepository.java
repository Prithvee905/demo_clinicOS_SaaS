package com.clinicsaas.auth.repository;

import com.clinicsaas.auth.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmailAndStatus(String email, String status);

    Optional<User> findByEmailAndClinicIdAndStatus(String email, UUID clinicId, String status);

    Optional<User> findByEmail(String email);

    Optional<User> findByIdAndClinicIdAndStatus(UUID id, UUID clinicId, String status);

    List<User> findByClinicIdAndStatus(UUID clinicId, String status);

    boolean existsByEmail(String email);
}
