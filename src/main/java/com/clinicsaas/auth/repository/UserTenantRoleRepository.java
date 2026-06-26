package com.clinicsaas.auth.repository;

import com.clinicsaas.auth.domain.UserTenantRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserTenantRoleRepository extends JpaRepository<UserTenantRole, UUID> {
    
    // We search by userId. The current_tenant setting will automatically apply Postgres RLS,
    // ensuring the query only returns a matching record if the current session tenant matches.
    @Query("SELECT r FROM UserTenantRole r WHERE r.user.id = :userId")
    Optional<UserTenantRole> findByUserId(@Param("userId") UUID userId);

    @Query("SELECT r FROM UserTenantRole r WHERE r.user.id = :userId AND r.tenantId = :tenantId")
    Optional<UserTenantRole> findByUserIdAndTenantId(@Param("userId") UUID userId, @Param("tenantId") UUID tenantId);
}
