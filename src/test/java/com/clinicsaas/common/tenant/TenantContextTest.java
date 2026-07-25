package com.clinicsaas.common.tenant;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;

public class TenantContextTest {

    @BeforeEach
    public void setUp() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("Verify TenantContext stores and clears ThreadLocal values correctly")
    public void testTenantContextSetAndClear() {
        // 1. Set values
        TenantContext.setTenantId("clinic-123");
        TenantContext.setUserId("user-456");
        TenantContext.setCurrentRole("ADMIN");
        TenantContext.setIsDoctor(true);

        // 2. Assert values are present
        assertEquals("clinic-123", TenantContext.getTenantId());
        assertEquals("user-456", TenantContext.getUserId());
        assertEquals("ADMIN", TenantContext.getCurrentRole());
        assertTrue(TenantContext.isDoctor());

        // 3. Clear context
        TenantContext.clear();

        // 4. Assert all ThreadLocal variables are completely reset
        assertNull(TenantContext.getTenantId(), "TenantId must be null after clear()");
        assertNull(TenantContext.getUserId(), "UserId must be null after clear()");
        assertNull(TenantContext.getCurrentRole(), "Role must be null after clear()");
        assertFalse(TenantContext.isDoctor(), "isDoctor must be false after clear()");
    }

    @Test
    @DisplayName("Verify TenantFilter executes clear() in finally block on successful request")
    public void testTenantFilterCleanupOnSuccess() throws Exception {
        TenantFilter filter = new TenantFilter();
        ServletRequest request = Mockito.mock(ServletRequest.class);
        ServletResponse response = Mockito.mock(ServletResponse.class);
        FilterChain chain = Mockito.mock(FilterChain.class);

        // Set context before filter chain
        TenantContext.setTenantId("clinic-abc");
        TenantContext.setUserId("user-xyz");

        filter.doFilter(request, response, chain);

        // Verify chain was invoked
        Mockito.verify(chain).doFilter(request, response);

        // Verify context was cleared after filter completion
        assertNull(TenantContext.getTenantId(), "TenantId must be cleared after filter completion");
        assertNull(TenantContext.getUserId(), "UserId must be cleared after filter completion");
    }

    @Test
    @DisplayName("Verify TenantFilter executes clear() in finally block even when an exception is thrown")
    public void testTenantFilterCleanupOnException() throws Exception {
        TenantFilter filter = new TenantFilter();
        ServletRequest request = Mockito.mock(ServletRequest.class);
        ServletResponse response = Mockito.mock(ServletResponse.class);
        FilterChain chain = Mockito.mock(FilterChain.class);

        // Mock exception in filter chain execution
        Mockito.doThrow(new RuntimeException("Simulated Controller Error")).when(chain).doFilter(any(), any());

        TenantContext.setTenantId("clinic-error-test");
        TenantContext.setUserId("user-error-test");

        assertThrows(RuntimeException.class, () -> filter.doFilter(request, response, chain));

        // Verify context is still cleared in finally block despite exception
        assertNull(TenantContext.getTenantId(), "TenantId must be cleared in finally block on exception");
        assertNull(TenantContext.getUserId(), "UserId must be cleared in finally block on exception");
    }
}
