package com.clinicsaas.common.tenant;

public final class TenantContext {
    private static final ThreadLocal<String> CURRENT_TENANT = new ThreadLocal<>();
    private static final ThreadLocal<String> CURRENT_ROLE = new ThreadLocal<>();
    private static final ThreadLocal<Boolean> IS_DOCTOR = ThreadLocal.withInitial(() -> false);

    private TenantContext() {}

    public static void setTenantId(String tenantId) {
        CURRENT_TENANT.set(tenantId);
    }

    public static String getTenantId() {
        return CURRENT_TENANT.get();
    }

    public static void setCurrentRole(String role) {
        CURRENT_ROLE.set(role);
    }

    public static String getCurrentRole() {
        return CURRENT_ROLE.get();
    }

    public static void setIsDoctor(boolean isDoctor) {
        IS_DOCTOR.set(isDoctor);
    }

    public static boolean isDoctor() {
        return IS_DOCTOR.get();
    }

    public static void clear() {
        CURRENT_TENANT.remove();
        CURRENT_ROLE.remove();
        IS_DOCTOR.remove();
    }
}
