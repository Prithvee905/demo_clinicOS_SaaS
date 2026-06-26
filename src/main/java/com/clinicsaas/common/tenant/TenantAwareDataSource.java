package com.clinicsaas.common.tenant;

import org.springframework.jdbc.datasource.DelegatingDataSource;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

public class TenantAwareDataSource extends DelegatingDataSource {

    public TenantAwareDataSource(DataSource targetDataSource) {
        super(targetDataSource);
    }

    @Override
    public Connection getConnection() throws SQLException {
        Connection connection = super.getConnection();
        return TenantAwareConnection.create(connection);
    }

    @Override
    public Connection getConnection(String username, String password) throws SQLException {
        Connection connection = super.getConnection(username, password);
        return TenantAwareConnection.create(connection);
    }
}
