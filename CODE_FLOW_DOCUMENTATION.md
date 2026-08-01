# ClinicOS SaaS — Step-by-Step Code Flow & Request Execution Architecture

This document provides a comprehensive, step-by-step technical breakdown of how a request moves through the ClinicOS SaaS platform — from a receptionist/doctor clicking an action on the Next.js frontend to database transactions, OpenPDF rendering, virtual thread event listeners, and Meta WhatsApp Cloud API delivery.

```
┌──────────────────────────────┐        ┌──────────────────────────────┐        ┌──────────────────────────────┐
│   Vercel Next.js Frontend    │        │  Security & Tenant Filters   │        │     Billing Controller       │
│  clinic-os-saa-s.vercel.app  ├───────►│ JwtAuthFilter / TenantFilter ├───────►│  generateInvoiceFromRx(...)  │
└──────────────────────────────┘        └──────────────────────────────┘        └──────────────┬───────────────┘
                                                                                               │
                                                                                               ▼
┌──────────────────────────────┐        ┌──────────────────────────────┐        ┌──────────────────────────────┐
│  Patient WhatsApp Delivery   │        │   WhatsAppSenderService      │        │  Async Event & OpenPDF Gen   │
│ Phone: +91 79815 96766 (SIM) │◄───────┤ Meta Graph API POST payload  │◄───────┤ InvoiceNotificationListener  │
└──────────────────────────────┘        └──────────────────────────────┘        └──────────────────────────────┘
```

---

## 🔄 Phase 1: User Action on Vercel Frontend (`invoices/page.tsx`)

1. A doctor or receptionist logs into **[clinic-os-saa-s.vercel.app](https://clinic-os-saa-s.vercel.app)**.
2. They view a patient's prescription and click **"Generate Invoice"** or **"Send WhatsApp"**.
3. The Next.js frontend sends an HTTP `POST` request to Railway:
   - **URL**: `https://clinicossaas-production.up.railway.app/api/invoices/generate/{prescriptionId}`
   - **Headers**:
     - `Authorization: Bearer <JWT_TOKEN>`
     - `X-Tenant-ID: <CLINIC_ID>`

---

## 🛡️ Phase 2: Security & Multi-Tenant Isolation (`JwtAuthFilter.java` & `TenantFilter.java`)

1. **`JwtAuthFilter.java`**:
   - Intercepts the HTTP request on the Spring Security chain.
   - Decodes and verifies the JWT signature using `JWT_SECRET`.
   - Extracts the user's role (`ADMIN`, `RECEPTIONIST`, `DOCTOR`) and populates the `SecurityContext`.

2. **`TenantFilter.java`**:
   - Extracts the `clinicId` from the request header/JWT claim.
   - Binds `clinicId` to **`TenantContext`** (`ThreadLocal` storage).
   - This guarantees 100% data isolation so Clinic A can never access Clinic B's records in the database.

---

## 📄 Phase 3: Invoice Creation & Event Dispatch (`BillingService.java`)

1. **`BillingController.java`** delegates to **`BillingService.java`**:
   - Retrieves prescription line items (medicines, dosages, quantities, unit prices, GST tax calculations).
   - Adds the consulting doctor's fee line item (exempt from GST).
   - Computes Subtotal, Tax Amount, and Grand Total.

2. **`InvoiceNumberGenerator.java`**:
   - Generates a unique sequential invoice number (e.g. `INV-2026-000005`).

3. **Database Insertion**:
   - Saves the new `Invoice` entity into **Neon PostgreSQL** database in `PENDING` status.

4. **Async Event Trigger**:
   - Fires `eventPublisher.publishEvent(new InvoiceCreatedEvent(this, invoice.getId(), clinicId, userId))`.

---

## ⚡ Phase 4: Async Virtual Thread Processing (`InvoiceNotificationListener.java`)

1. **`InvoiceNotificationListener.java`**:
   - Listens for `InvoiceCreatedEvent` using Java 17 Virtual Threads (`@Async("virtualThreadExecutor")`).
   - Re-binds `TenantContext` to the background execution thread.

2. **Dynamic In-Memory PDF Rendering (`PdfGeneratorService.java`)**:
   - Uses **OpenPDF** (`com.lowagie.text.Document`) to build the branded PDF tax invoice (clinic logo, patient demographics, doctor info, itemized fee table, grand total, and digital verification stamp).
   - Renders raw PDF bytes directly in memory (`byte[] pdfBytes`).

3. **Public PDF URL Assignment**:
   - Stores a `FileRecord` in PostgreSQL.
   - Generates the public Railway download URL:
     `https://clinicossaas-production.up.railway.app/api/invoices/public-pdf/{invoiceId}`
   - Updates invoice status to `GENERATED`.

4. **Triggers WhatsApp Notification**:
   - Calls `whatsAppSenderService.sendInvoiceNotification(invoice.getId())`.

---

## 📱 Phase 5: Meta Cloud API Payload Construction (`WhatsAppSenderService.java`)

1. **Reads Environment Configuration**:
   - `WHATSAPP_PHONE_NUMBER_ID` = `1201808123018828` *(SIM +91 79815 96766)*
   - `WHATSAPP_TEMPLATE_NAME` = `invoice_pdf_alert`
   - `WHATSAPP_LANGUAGE_CODE` = `en`
   - `WHATSAPP_SEND_PARAMS` = `true`

2. **Constructs JSON Payload for Meta**:
   ```json
   {
     "messaging_product": "whatsapp",
     "to": "+916281356498",
     "type": "template",
     "template": {
       "name": "invoice_pdf_alert",
       "language": { "code": "en" },
       "components": [
         {
           "type": "header",
           "parameters": [
             {
               "type": "document",
               "document": {
                 "link": "https://clinicossaas-production.up.railway.app/api/invoices/public-pdf/a6eeb28b...",
                 "filename": "Invoice-INV-2026-000005.pdf"
               }
             }
           ]
         },
         {
           "type": "body",
           "parameters": [
             { "type": "text", "text": "sunnnnny" },
             { "type": "text", "text": "INV-2026-000005" },
             { "type": "text", "text": "the pet well clinic" }
           ]
         }
       ]
     }
   }
   ```

---

## 🌐 Phase 6: Meta Server Communication & PDF Fetch (`BillingController.java`)

1. `WhatsAppSenderService` sends HTTP `POST` to Meta Cloud API:
   `https://graph.facebook.com/v18.0/1201808123018828/messages`

2. Meta's servers receive the request, read the document header link, and send an HTTP `GET` back to Railway:
   `https://clinicossaas-production.up.railway.app/api/invoices/public-pdf/{invoiceId}`

3. **`BillingController.getPublicInvoicePdf`**:
   - Permitted by `SecurityConfig.java` without authentication.
   - Serves the raw PDF bytes with `Content-Type: application/pdf`.

4. Meta's servers download the PDF bytes, wrap them into a WhatsApp document attachment, and assign a unique tracking ID (`wamid.HBgM...`).

---

## 📊 Phase 7: Delivery Audit & Database Sync (`WhatsAppLogRepository`)

1. Meta API returns HTTP `200 OK` with JSON response:
   ```json
   {
     "messaging_product": "whatsapp",
     "contacts": [ { "input": "+916281356498", "wa_id": "916281356498" } ],
     "messages": [ { "id": "wamid.HBgMOTE5NTQy...", "message_status": "accepted" } ]
   }
   ```

2. **Database Log Saved**:
   - `WhatsAppSenderService` creates/updates a record in `whatsapp_logs`:
     - `status` = `SENT`
     - `message_id` = `{"messaging_product":"whatsapp", ... "message_status":"accepted"}`
     - `sent_at` = `2026-07-30 11:46:49`

3. **Audit Log**:
   - `AuditLogService` records action `WHATSAPP_SENT` for clinic governance.

4. **Patient Screen**:
   - The WhatsApp message pops up on the patient's phone from **`+91 79815 96766`** with the PDF invoice file attached directly at the top of the message! 📱📄🎉🚀
