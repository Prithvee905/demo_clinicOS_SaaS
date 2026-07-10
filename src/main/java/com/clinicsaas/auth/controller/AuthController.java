package com.clinicsaas.auth.controller;

import com.clinicsaas.auth.dto.AuthResponse;
import com.clinicsaas.auth.dto.CreateUserRequest;
import com.clinicsaas.auth.dto.LoginRequest;
import com.clinicsaas.auth.dto.RegisterRequest;
import com.clinicsaas.auth.dto.RefreshTokenRequest;
import com.clinicsaas.auth.service.AuthService;
import com.clinicsaas.common.audit.AuditLogService;
import com.clinicsaas.common.tenant.TenantContext;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private AuditLogService auditLogService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.registerTenant(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<AuthResponse> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        AuthResponse response = authService.refreshAccessToken(request.getRefreshToken());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        String userIdStr = TenantContext.getUserId();
        String clinicIdStr = TenantContext.getTenantId();
        if (userIdStr != null && clinicIdStr != null) {
            auditLogService.logAction(
                    UUID.fromString(userIdStr),
                    UUID.fromString(clinicIdStr),
                    "USER_LOGOUT",
                    "USER",
                    UUID.fromString(userIdStr),
                    "User logged out successfully"
            );
        }
        return ResponseEntity.ok().build();
    }

    @PostMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> createUser(@Valid @RequestBody CreateUserRequest request) {
        authService.createUser(request);
        return new ResponseEntity<>("User added to clinic successfully", HttpStatus.CREATED);
    }
}
