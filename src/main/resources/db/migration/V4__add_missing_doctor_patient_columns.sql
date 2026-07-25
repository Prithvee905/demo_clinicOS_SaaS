-- Add missing email and phone columns to doctors table
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS email VARCHAR(100);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Add missing email and phone columns to patients table (ensure they exist)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS email VARCHAR(100);
