package com.clinicsaas.common.tenant;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.Statement;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class TenantAwareConnection {

    private static final Logger log = LoggerFactory.getLogger(TenantAwareConnection.class);

    private TenantAwareConnection() {}

    public static Connection create(Connection delegate) {
        return (Connection) Proxy.newProxyInstance(
                TenantAwareConnection.class.getClassLoader(),
                new Class<?>[]{Connection.class},
                new TenantConnectionInvocationHandler(delegate)
        );
    }

    private static class TenantConnectionInvocationHandler implements InvocationHandler {
        private final Connection delegate;

        public TenantConnectionInvocationHandler(Connection delegate) {
            this.delegate = delegate;
        }

        @Override
        public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
            if ("setAutoCommit".equals(method.getName()) && args != null && args.length == 1) {
                boolean autoCommit = (boolean) args[0];
                delegate.setAutoCommit(autoCommit);
                if (!autoCommit) {
                    String tenantId = TenantContext.getTenantId();
                    if (tenantId != null) {
                        log.debug("Setting transaction-local tenant context to {}", tenantId);
                        try (Statement stmt = delegate.createStatement()) {
                            stmt.execute("SET LOCAL app.current_tenant = '" + tenantId + "'");
                        }
                    }
                }
                return null;
            }
            return method.invoke(delegate, args);
        }
    }
}
