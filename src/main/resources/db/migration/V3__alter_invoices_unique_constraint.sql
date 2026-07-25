ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_invoice_number_key;
ALTER TABLE invoices ADD CONSTRAINT invoices_clinic_id_invoice_number_key UNIQUE (clinic_id, invoice_number);
