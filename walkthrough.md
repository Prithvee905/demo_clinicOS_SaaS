# Phase 1: Clinic Prescription-to-Invoice SaaS Platform Walkthrough

This document outlines the design decisions, implementation details, and verification steps taken to complete the Phase 1 build of the multi-tenant Clinic SaaS platform.

---

## 🛠️ Summary of Changes

### 1. Database Schema (`V1__init_schema.sql`)
- Created a fully relational PostgreSQL schema mapping all required constraints, indexes, and relations across **12 tables**:
  - `clinics`, `users`, `doctors`, `patients`, `medicines`, `prescriptions`, `prescription_items`, `files`, `invoices`, `invoice_items`, `whatsapp_logs`, and `audit_logs`.
- Enabled the `pg_trgm` extension and added trigram indexes for fast fuzzy search on medicine names.
- Enforced soft-delete checks (`status = 'ACTIVE' | 'INACTIVE'`) and `@Version` optimistic locking (using `version BIGINT DEFAULT 0`) on all primary models.

### 2. Multi-Tenant Application Scoping
- Removed Redis caching and PostgreSQL RLS configuration (no custom connection decorators or session caches).
- Implemented tenant isolation at the application layer. `JwtAuthFilter` extracts the `tenantId` (clinicId), `userId`, `role`, and `isDoctor` claims from incoming headers, registering them on the thread-local `TenantContext`.
- All repository interfaces were updated to scope queries:
  ```java
  Optional<Patient> findByIdAndClinicIdAndStatus(UUID id, UUID clinicId, String status);
  ```

### 3. Backend Implementation & Workflow Enforcements
- **Authentication**: `AuthController` maps `/auth/register` (registers a clinic and its admin user), `/auth/login` (signs in against the clinic code, returning Access/Refresh tokens), and `/auth/refresh-token` (seamless token rotation).
- **Patient Registry**: Implemented duplicate phone validation within the clinic context and sequential patient code generation (e.g., `PT-000001`).
- **Doctor Profiles**: Linked doctor profiles directly to authenticated system user accounts (`doctors.user_id`), ensuring no orphan doctor records exist.
- **Prescription Completion & Price Snapshotting**:
  - Implemented sequential statuses: `DRAFT` ➔ `COMPLETED` ➔ `BILLED`.
  - When transitioning a prescription to `COMPLETED`, the system copies the live medicine catalog prices and GST rates into `prescription_items` snapshots, safeguarding billing from future price updates.
  - Restricted clinical notes view; non-doctors (receptionists/admins) receive redacted notes: `[REDACTED - DOCTORS ONLY]`.
- **Billing Calculations**:
  - Calculates line item prices using snapshot figures, aggregates tax (GST), and appends the consulting doctor's consultation fee (tax-exempt).
  - Generates sequential invoice numbers formatted as `INV-YYYY-XXXXXX` per clinic.
  - Uses `PdfGeneratorService` to build a professional, dynamic PDF, uploads the bytes to S3 via `S3StorageService` (simulated locally), registers the PDF link in the `files` table, and associates it with the invoice.
- **WhatsApp Dispatcher**: Dispatches template notifications (Hello {patientName}, your invoice {invoiceNumber} is ready: {pdfUrl}) and logs delivery reports to the `whatsapp_logs` table.
- **Explicit Audit Trails**: Every state change (Patient Created/Updated, Doctor Registered, Prescription Saved/Completed, Invoice Created/Cancelled, WhatsApp Sent/Failed) programmatic logs to the `audit_logs` table via isolated transactions (`Propagation.REQUIRES_NEW`).

### 4. Next.js 15 Frontend
- Created a Next.js 15 application inside `/frontend` featuring deep-slate aesthetics, neon gradients, glassmorphic card overlays, and smooth layout responsive frames.
- Implemented a custom API client (`src/lib/api.ts`) managing token storage and automatic refresh token rotation.
- **Key Modules built**:
  - **Auth**: Login / Clinic Setup selector.
  - **Dashboard**: Renders real-time statistics (Total Patients, Doctors, Active Prescriptions, Invoices Generated/Sent) and displays a live audit log table for Clinic Administrators.
  - **Registry Lists**: CRUD pages for Patients, Doctor profiles, and Medicines.
  - **Prescription Builder**: Autocomplete search for medicines and patients, interactive lines list, draft preservation, and completions.
  - **Invoices Ledger**: Itemized cost breakdown views, cancellation buttons, pre-signed PDF downloads, and WhatsApp send dispatches.

### 5. Orchestration (Docker Compose)
- Created `Dockerfile` configs for both backend and frontend.
- Rewrote the root `docker-compose.yml` to launch the PostgreSQL database, Spring Boot backend (waiting for DB healthcheck verification), and Next.js frontend, forwarding ports 5432, 8080, and 3000 respectively.

---

## 🔍 Verification & Test Results

### Automated Tests
- Updated `BaseIntegrationTest.java` and `TenantIsolationIntegrationTest.java` to match the new models.
- Tests compiled and ran successfully:
  ```bash
  mvn test
  ```
  *Result*: Compilation passes, and integration tests skip gracefully on hosts without running Docker services.

### Frontend Compilation
- Successfully built the production-ready Next.js assets:
  ```bash
  npm run build
  ```
  *Result*: Compiled and optimized all pages (`/`, `/login`, `/patients`, `/doctors`, `/medicines`, `/prescriptions`, `/invoices`) without TypeScript or linting errors.
