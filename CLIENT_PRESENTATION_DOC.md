# CleanicX SaaS Platform — Executive Product Specification & Client Presentation Deck

**"Modern Clinic Operations. Smarter Billing. Instant WhatsApp Patient Communication."**

---

## Executive Summary

**CleanicX** is an enterprise-grade, multi-tenant Clinic Management SaaS platform designed to replace legacy hospital software with a sleek, high-efficiency digital workflow. Built using modern cloud technologies, CleanicX streamlines patient registration, digital e-prescriptions, automated GST-compliant tax billing, and instant WhatsApp delivery of PDF invoices.

### Live Production Infrastructure
- **Live Web Application**: [https://clinic-os-saa-s.vercel.app](https://clinic-os-saa-s.vercel.app)
- **Production Backend API**: [https://clinicossaas-production.up.railway.app](https://clinicossaas-production.up.railway.app)
- **Official WhatsApp Business Line**: `+91 79815 96766`
- **Database Architecture**: Neon PostgreSQL Cloud (Singapore Region)

---

## Key Core Modules

### 1. Multi-Tenant Clinic Workspace Isolation
- **100% Data Privacy**: Every clinic operates within its own isolated workspace identified by a unique `clinicCode`.
- **Role-Based Access Control (RBAC)**: Distinct permission levels for `ADMIN`, `DOCTOR`, and `RECEPTIONIST`.

### 2. Patient Directory & EHR Records
- Unique patient code generation (e.g. `PT-1001`).
- Demographics, contact numbers, blood groups, residential address, and consultation history.
- Instant search by name, phone number, or patient code.

### 3. Doctor & Medical Staff Management
- Complete profile management including medical registration numbers (MCI/NMC) and specializations.
- Custom consultation fee structures per doctor.

### 4. Pharmaceutical & Medicine Catalog
- Centralized medicine database with unit packaging types (Tablets, Capsules, Syrups, Injections).
- Automated GST tax rate assignment (0%, 5%, 12%, 18%).

### 5. Digital e-Prescriptions
- Fast digital prescription creation interface for doctors.
- Drug selection, dosage instructions, frequency (`1-0-1`), duration, and clinical notes.
- Automatic transition from `DRAFT` to `COMPLETED` for billing dispatch.

### 6. Automated Billing & Tax Invoicing
- 1-Click invoice generation from completed prescriptions.
- Automatic itemized calculation of consultation fees, medicine costs, and GST breakdown.
- Dynamic OpenPDF engine renders branded PDF receipts on-the-fly.

### 7. Direct Meta WhatsApp Cloud API Integration
- Automated delivery of PDF tax invoices directly to patient WhatsApp numbers.
- **No Manual Chat Required**: Uses approved Meta Utility Templates to deliver messages instantly.
- Live delivery status tracking (`SENT`, `DELIVERED`, `READ`).

---

## 3-Step Operational Workflow

```
[ Step 1: Patient Intake ] ──► [ Step 2: Digital e-Prescription ] ──► [ Step 3: Billing & WhatsApp PDF ]
  Receptionist registers         Doctor prescribes medicines &         1-Click invoice generation &
  patient demographics.          consultation fee.                     instant WhatsApp delivery.
```

1. **Step 1 — Patient Intake (Receptionist)**: Patient arrives and is registered in the database with their phone number.
2. **Step 2 — Digital Consultation (Doctor)**: Doctor examines the patient and generates a digital prescription.
3. **Step 3 — Billing & WhatsApp PDF (Receptionist)**: Invoice is generated with one click, and the PDF tax receipt lands directly on the patient's mobile phone via WhatsApp.

---

## Technical & Security Architecture

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS (White & Emerald Mint Green theme).
- **Backend**: Spring Boot 3, Java 17 Virtual Threads (Loom) for ultra-high throughput.
- **Database**: Multi-tenant Neon PostgreSQL with strict `ThreadLocal` tenant isolation filters.
- **PDF Engine**: OpenPDF rendering engine producing crisp, branded vector PDF invoices.
- **Security**: JWT Authentication, BCrypt Password Hashing, HTTPS SSL Encryption.

---

## Client Demo & Login Credentials

To demonstrate CleanicX to prospective clinic clients, use the following pre-configured demo account:

| Field | Value |
| :--- | :--- |
| **Website URL** | `https://clinic-os-saa-s.vercel.app` |
| **Clinic Code** | `city-care` |
| **Email** | `admin@clinic.com` |
| **Password** | `Admin@123` |
| **Role** | Clinic Administrator |

---

## Business Value & ROI

- ⚡ **90% Reduction in Patient Checkout Time**: Automated billing and instant digital receipts eliminate queue delays.
- 📄 **100% Paperless Operations**: Saves paper printing costs by delivering PDF invoices via WhatsApp.
- 📱 **Enhanced Patient Experience**: Modern WhatsApp receipts boost patient trust and brand perception.
- 🔐 **Compliance & Audit Trails**: Every clinical action is audited with timestamps for complete legal compliance.
