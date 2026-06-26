-- 1. Create clinics mapping table
CREATE TABLE clinics (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE
);

-- 2. Populate any existing tenant UUIDs from user_tenant_roles to keep consistency
-- For any unique tenant_id in user_tenant_roles, insert a default mapping if it doesn't exist.
-- Since it's a seed / clean-up, we can resolve existing ones with a generic name/code.
INSERT INTO clinics (id, name, code)
SELECT DISTINCT tenant_id, 'Clinic-' || SUBSTRING(tenant_id::text FROM 1 FOR 8), 'clinic-' || SUBSTRING(tenant_id::text FROM 1 FOR 8)
FROM user_tenant_roles
ON CONFLICT (id) DO NOTHING;
