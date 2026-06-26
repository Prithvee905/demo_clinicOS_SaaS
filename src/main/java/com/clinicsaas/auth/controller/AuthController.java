package com.clinicsaas.auth.controller;

import com.clinicsaas.auth.dto.AuthResponse;
import com.clinicsaas.auth.dto.CreateUserRequest;
import com.clinicsaas.auth.dto.LoginRequest;
import com.clinicsaas.auth.dto.RegisterRequest;
import com.clinicsaas.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse authResponse = authService.registerTenant(request);
        org.springframework.http.ResponseCookie cookie = org.springframework.http.ResponseCookie.from("jwt_token", authResponse.getToken())
                .httpOnly(true)
                .secure(false)
                .path("/")
                .maxAge(24 * 60 * 60)
                .sameSite("Lax")
                .build();
        return ResponseEntity.status(HttpStatus.CREATED)
                .header(org.springframework.http.HttpHeaders.SET_COOKIE, cookie.toString())
                .body(authResponse);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse authResponse = authService.login(request);
        org.springframework.http.ResponseCookie cookie = org.springframework.http.ResponseCookie.from("jwt_token", authResponse.getToken())
                .httpOnly(true)
                .secure(false)
                .path("/")
                .maxAge(24 * 60 * 60)
                .sameSite("Lax")
                .build();
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.SET_COOKIE, cookie.toString())
                .body(authResponse);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        org.springframework.http.ResponseCookie cookie = org.springframework.http.ResponseCookie.from("jwt_token", "")
                .httpOnly(true)
                .secure(false)
                .path("/")
                .maxAge(0)
                .sameSite("Lax")
                .build();
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.SET_COOKIE, cookie.toString())
                .build();
    }

    @PostMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> createUser(@Valid @RequestBody CreateUserRequest request) {
        authService.createUser(request);
        return new ResponseEntity<>("User added to clinic successfully", HttpStatus.CREATED);
    }
}
