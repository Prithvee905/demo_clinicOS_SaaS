package com.clinicsaas.common.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Autowired
    private JwtAuthFilter jwtAuthFilter;

    @Autowired
    private org.springframework.core.env.Environment env;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        boolean isTest = java.util.Arrays.asList(env.getActiveProfiles()).contains("test");

        if (isTest) {
            http.csrf(AbstractHttpConfigurer::disable);
        } else {
            org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler requestHandler = 
                    new org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler();
            requestHandler.setCsrfRequestAttributeName("_csrf");
            http.csrf(csrf -> csrf
                .csrfTokenRepository(new SafeCookieCsrfTokenRepository())
                .csrfTokenRequestHandler(requestHandler)
                .ignoringRequestMatchers("/api/auth/**")
            );
        }

        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/index.html", "/styles.css", "/app.js", "/favicon.ico").permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                .sessionAuthenticationStrategy(new org.springframework.security.web.authentication.session.NullAuthenticatedSessionStrategy())
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        if (!isTest) {
            http.addFilterAfter(new CsrfCookieFilter(), CsrfFilter.class);
        }

        return http.build();
    }

    private static class CsrfCookieFilter extends org.springframework.web.filter.OncePerRequestFilter {
        @Override
        protected void doFilterInternal(jakarta.servlet.http.HttpServletRequest request,
                                        jakarta.servlet.http.HttpServletResponse response,
                                        jakarta.servlet.FilterChain filterChain)
                throws jakarta.servlet.ServletException, java.io.IOException {
            org.springframework.security.web.csrf.CsrfToken csrfToken = 
                    (org.springframework.security.web.csrf.CsrfToken) request.getAttribute(org.springframework.security.web.csrf.CsrfToken.class.getName());
            if (csrfToken != null) {
                csrfToken.getToken(); // Forces generation of the token and serialization into the cookie
            }
            filterChain.doFilter(request, response);
        }
    }

    private static class SafeCookieCsrfTokenRepository implements CsrfTokenRepository {
        private final CookieCsrfTokenRepository delegate = CookieCsrfTokenRepository.withHttpOnlyFalse();

        @Override
        public CsrfToken generateToken(jakarta.servlet.http.HttpServletRequest request) {
            return delegate.generateToken(request);
        }

        @Override
        public void saveToken(CsrfToken token, jakarta.servlet.http.HttpServletRequest request, jakarta.servlet.http.HttpServletResponse response) {
            // Prevent CsrfAuthenticationStrategy from clearing the cookie on each authenticated request
            if (token == null) {
                if (request.getRequestURI().endsWith("/logout")) {
                    delegate.saveToken(null, request, response);
                }
                return;
            }
            delegate.saveToken(token, request, response);
        }

        @Override
        public CsrfToken loadToken(jakarta.servlet.http.HttpServletRequest request) {
            return delegate.loadToken(request);
        }
    }
}
