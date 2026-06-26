package com.clinicsaas.common.security;

import com.clinicsaas.auth.service.JwtService;
import com.clinicsaas.common.tenant.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.Collections;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    @Autowired
    private JwtService jwtService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        String jwt = null;
        if (request.getCookies() != null) {
            for (jakarta.servlet.http.Cookie cookie : request.getCookies()) {
                if ("jwt_token".equals(cookie.getName())) {
                    jwt = cookie.getValue();
                    break;
                }
            }
        }
        
        // Fallback to Authorization Header (useful for integration tests)
        if (jwt == null) {
            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                jwt = authHeader.substring(7);
            }
        }
        
        String username = null;
        String tenantId = null;
        String role = null;
        Boolean isDoctor = false;

        if (jwt != null) {
            try {
                if (jwtService.isTokenValid(jwt)) {
                    username = jwtService.extractUsername(jwt);
                    tenantId = jwtService.extractTenantId(jwt);
                    role = jwtService.extractRole(jwt);
                    isDoctor = jwtService.extractIsDoctor(jwt);
                }
            } catch (Exception e) {
                logger.warn("JWT token parsing failed: " + e.getMessage());
            }
        }

        try {
            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                // Setup TenantContext first so that it is available for any queries triggered during security validation
                TenantContext.setTenantId(tenantId);
                TenantContext.setCurrentRole(role);
                TenantContext.setIsDoctor(isDoctor != null && isDoctor);

                List<SimpleGrantedAuthority> authorities = Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role));
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        username, null, authorities
                );
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }

            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }
}
