# ClinicOS: Prescription-to-Invoice Multi-Tenant SaaS Platform

ClinicOS is a production-ready multi-tenant Clinic SaaS platform designed for clinical workflow automation, digital prescription generation, invoice PDF compiling, and WhatsApp message delivery.

---

## 🛠️ Technology Stack & Architecture

- **Backend**: Java 17, Spring Boot 3.3.0, Spring Security & JWT authentication.
- **Frontend**: Next.js 15 (React 19, TypeScript, Tailwind CSS, Lucide Icons).
- **Database**: PostgreSQL 16 (Local/Docker) with H2 In-Memory support (`local` profile for zero-prerequisite offline development).
- **Tenant Isolation**: Strict application-layer tenant scoping via JWT claims, `TenantContext` (`ThreadLocal`), and mandatory `clinic_id = ?` query filtering.
- **Object Storage**: AWS S3 SDK v2 (with resilient pre-signed URL generation and local fallback simulation).
- **Notifications**: Meta WhatsApp Cloud API v18.0 (REST integration with Resilience4j retry policy and mock logger fallbacks).
- **Containerization**: Docker & Multi-stage `docker-compose.yml` configuration.

---

## 📂 Project Architecture

The backend is structured as a **Modular Monolith** organized by domain features:

```text
com.clinicsaas
├── ClinicSaasApplication.java
├── common/
│   ├── tenant/        # TenantContext, TenantFilter, BaseTenantEntity
│   ├── security/      # JwtAuthFilter, SecurityConfig, JwtService
│   ├── audit/         # AuditLog entity, AuditLogService, AuditLogResponseDto, PatientAuditAspect
│   ├── exception/     # GlobalExceptionHandler, CustomException
│   └── config/        # OpenAPIConfig, VirtualThreadExecutorConfig
├── auth/
│   ├── controller/    # AuthController (register, login, refresh-token, logout)
│   ├── service/       # AuthService, JwtService
│   ├── repository/    # UserRepository, ClinicRepository
│   └── domain/        # User, Clinic, Role
├── patient/
│   ├── controller/    # PatientController
│   ├── service/       # PatientService
│   ├── repository/    # PatientRepository
│   └── domain/        # Patient
├── doctor/
│   ├── controller/    # DoctorController
│   ├── service/       # DoctorService
│   ├── repository/    # DoctorRepository
│   └── domain/        # Doctor
├── prescription/
│   ├── controller/    # PrescriptionController
│   ├── service/       # PrescriptionService
│   ├── repository/    # PrescriptionRepository, UnmatchedMedicineRepository
│   ├── domain/        # Prescription, PrescriptionItem, UnmatchedMedicineEntry
│   └── medicine/      # Medicine, MedicineRepository, MedicineCatalogService
├── billing/
│   ├── controller/    # BillingController
│   ├── service/       # BillingService (invoice numbering, cost calculations, PDF compilation)
│   ├── repository/    # InvoiceRepository
│   └── domain/        # Invoice, InvoiceItem
├── file/
│   ├── domain/        # FileRecord (tenant-isolated S3 file metadata)
│   └── repository/    # FileRecordRepository
└── notification/
    ├── pdf/           # PdfGeneratorService (OpenPDF renderer), S3StorageService
    └── whatsapp/      # WhatsAppSenderService (Meta Cloud API client)
```

---

## 🔒 Security & Tenant Isolation

1. **Stateless JWT Claims**: Every JWT issued on login contains `clinicId`, `userId`, and `role`.
2. **Context Binding**: `JwtAuthFilter` extracts `clinicId` and binds it to a thread-local `TenantContext`.
3. **Guaranteed `finally` Cleanup**: `JwtAuthFilter` and `TenantFilter` wrap request execution in a `try { ... } finally { TenantContext.clear(); }` block, guaranteeing that `ThreadLocal` variables are removed after every request.
4. **Application Scoping**: Database entities extend `BaseTenantEntity`, ensuring every repository query includes `clinicId`.
5. **Self-Healing Session Handler**: The frontend `apiFetch` wrapper catches both `401` and `403` status codes, clearing stale local storage tokens and auto-redirecting to `/login`.

---

## 🚀 Running the Application Locally

### 1. Start the Backend (Spring Boot)

#### Option A: Offline Mode (In-Memory Database - Recommended for Quick Testing)
Run with the `local` profile to automatically initialize an in-memory H2 database:
```bash
mvn spring-boot:run -Dspring-boot.run.profiles=local
```
- **Backend API**: `http://localhost:8080/api`
- **H2 Web Console**: `http://localhost:8080/h2-console` (JDBC URL: `jdbc:h2:mem:clinicsaas`, User: `sa`, Password: *blank*)
- **Swagger API Docs**: `http://localhost:8080/swagger-ui/index.html`

#### Option B: Standard Mode (PostgreSQL Database)
Make sure your PostgreSQL instance is running on port `5432`, then run:
```bash
mvn spring-boot:run
```

---

### 2. Start the Frontend (Next.js 15)

In a new terminal window, navigate to the `frontend/` directory:
```bash
cd frontend
npm run dev
```
- **Client Application**: Open **`http://localhost:3000`** in your browser.

---

## 🧪 Automated Test Verification

Execute test suites directly from the project root:

### 1. `TenantContext` Lifecycle & Cleanup Test
Verifies that `TenantContext` is cleared after every request and that no `ThreadLocal` memory leaks occur:
```bash
mvn test -Dtest=TenantContextTest
```

### 2. End-to-End Clinical Workflow Test
Executes an 11-step clinical pipeline in-memory (Register Clinic -> Login -> Create Doctor -> Create Patient -> Add Medicine -> Create Prescription -> Complete Prescription -> Generate Invoice -> Compile PDF -> S3 Upload -> WhatsApp Dispatch):
```bash
mvn test -Dtest=EndToEndWorkflowTest
```

---

## 🐳 Docker Deployment

To launch the multi-container stack (PostgreSQL, Spring Boot Backend, Next.js Frontend):
```bash
docker-compose up --build -d
```
