-- Enable PostgreSQL Trigram Extension for fuzzy searching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Global Users Table (No RLS)
CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(100)
);

-- 2. User Tenant Roles Table (RLS Enabled)
CREATE TABLE user_tenant_roles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL,
    is_doctor BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE user_tenant_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenant_roles FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON user_tenant_roles
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE INDEX idx_user_tenant_roles_tenant ON user_tenant_roles(tenant_id);
CREATE INDEX idx_user_tenant_roles_user_tenant ON user_tenant_roles(tenant_id, user_id);

-- 3. Patients Table (RLS Enabled)
CREATE TABLE patients (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(50) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(20),
    consent_given_at TIMESTAMP,
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_state VARCHAR(100),
    address_postal_code VARCHAR(20)
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON patients
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE INDEX idx_patients_tenant ON patients(tenant_id);
CREATE INDEX idx_patients_tenant_patient ON patients(tenant_id, id);

-- 4. Prescriptions Table (RLS Enabled)
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    doctor_username VARCHAR(50) NOT NULL,
    diagnosis TEXT,
    consultation_notes TEXT,
    created_at TIMESTAMP NOT NULL
);

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON prescriptions
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE INDEX idx_prescriptions_tenant ON prescriptions(tenant_id);
CREATE INDEX idx_prescriptions_tenant_patient ON prescriptions(tenant_id, patient_id);

-- 5. Prescription Items Table (RLS Enabled)
CREATE TABLE prescription_items (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    medicine_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    duration VARCHAR(100)
);

ALTER TABLE prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_items FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON prescription_items
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE INDEX idx_prescription_items_tenant ON prescription_items(tenant_id);

-- 6. Invoices Table (RLS Enabled)
CREATE TABLE invoices (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    total_amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    delivery_status VARCHAR(50) NOT NULL,
    pdf_url VARCHAR(2048),
    created_at TIMESTAMP NOT NULL
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON invoices
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_tenant_patient ON invoices(tenant_id, patient_id);
CREATE INDEX idx_invoices_tenant_created ON invoices(tenant_id, created_at);

-- 7. Invoice Items Table (RLS Enabled)
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON invoice_items
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE INDEX idx_invoice_items_tenant ON invoice_items(tenant_id);

-- 8. Payments Table (RLS Enabled)
CREATE TABLE payments (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    paid_at TIMESTAMP NOT NULL
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON payments
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE INDEX idx_payments_tenant ON payments(tenant_id);

-- 9. Audit Logs Table (RLS Enabled)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    username VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    patient_id UUID,
    details VARCHAR(1000),
    timestamp TIMESTAMP NOT NULL
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON audit_logs
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);

-- 10. Unmatched Medicine Entries Table (RLS Enabled)
CREATE TABLE unmatched_medicine_entries (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name_entered VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL
);

ALTER TABLE unmatched_medicine_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE unmatched_medicine_entries FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON unmatched_medicine_entries
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE INDEX idx_unmatched_medicines_tenant ON unmatched_medicine_entries(tenant_id);

-- 11. Medicines Table (Global, No RLS)
CREATE TABLE medicines (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    generic_composition VARCHAR(255),
    dosage_form VARCHAR(100)
);

-- Trigram index for medicines.name to enable fast fuzzy search autocomplete
CREATE INDEX idx_medicines_name_trgm ON medicines USING gin (name gin_trgm_ops);
