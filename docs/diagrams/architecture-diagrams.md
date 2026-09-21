# ClinicCare — Architecture Diagrams

All diagrams reflect the **implemented** codebase (not the plan). Verified against:

- `apps/api/src` — NestJS, 24 module controllers, Prisma (40+ models, 15 enums)
- `apps/web` — Next.js 16 app router, Tailwind + shadcn/ui, tenant subdomain theming
- `infrastructure/k8s` — namespace `cliniccare`, Postgres/Redis/API/Web, HPA, ingress
- `prisma/schema.prisma` + `prisma/seed.ts`

Rendering: these are Mermaid diagrams — open this file in VS Code (Markdown Preview Mermaid) or paste each block at https://mermaid.live
> Browse rendered, per-diagram HTML pages (one page per diagram, Mermaid v11 via CDN):
> [`docs/diagrams/index.html`](diagrams/index.html)

---

## 1. System / Container Architecture

```mermaid
flowchart TB
  subgraph USERS["Users"]
    PAT["Patient"]
    DOC["Doctor"]
    STAFF["Reception / Nurse / Pharmacy / Accounts"]
    SA["Super Admin"]
  end

  subgraph BROWSER["Browser — any subdomain"]
    WEB["Next.js 16 Web · :3000<br/>standalone output, Tailwind + shadcn/ui<br/>proxy.ts (tenant subdomain parse)<br/>TenantThemeProvider + TenantBanner"]
  end

  subgraph INGRESS["NGINX Ingress — cliniccare-ingress"]
    ING["api.cliniccare.local → api:80<br/>web.cliniccare.local → web:80"]
  end

  subgraph CLUSTER["K8s — namespace: cliniccare"]
    API["NestJS API · :3000<br/>REST + OpenAPI /docs · /healthz<br/>24 controllers · Auth + RBAC + tenant guards"]
    PG[("PostgreSQL 15 :5432<br/>postgres-pvc (persistent volume)")]
    RD[("Redis :6379")]
  end

  subgraph EXT["External (configured via secrets, not yet wired) "]
    S3["Object Storage (S3)"]
    SMTP["SMTP / Email"]
    SMSWP["SMS / WhatsApp"]
    PAY["Payment gateway"]
    VID["Video provider (teleconsult)"]
  end

  PAT --> WEB
  DOC --> WEB
  STAFF --> WEB
  SA --> WEB

  WEB --> ING
  API --> ING
  ING -.-> WEB
  ING -.-> API

  API --> PG
  API --> RD
  API -.-> S3
  API -.-> SMTP
  API -.-> SMSWP
  API -.-> PAY
  API -.-> VID
```

---

## 2. Block / Module Diagram — API (NestJS)

```mermaid
flowchart LR
  subgraph PLATFORM["Platform Core"]
    AUTH["Auth"]
    USERS["Users"]
    TENANTS["Tenants"]
    AUDIT["Audit + RBAC"]
    PRISMA["Prisma"]
  end

  subgraph DIRECTORY["Directory"]
    CLINICS["Clinics"]
    DOCTORS["Doctors"]
    CATALOG["Catalog"]
  end

  subgraph CLINICAL["Clinical"]
    PATIENTS["Patients"]
    APPT["Appointments"]
    CLIN["Clinical"]
    DOCS["Documents"]
    TREAT["Treatments"]
    SKIN["Skin"]
  end

  subgraph COMMERCE["Commerce"]
    PROD["Products"]
    ORDERS["Orders"]
    BILL["Billing"]
  end

  subgraph ENGAGE["Engagement"]
    NOTIF["Notifications"]
    CMS["Cms / Public"]
    ENG["Engagement"]
    SEARCH["Search"]
    REPORTS["Reports"]
  end

  API --> PLATFORM
  API --> DIRECTORY
  API --> CLINICAL
  API --> COMMERCE
  API --> ENGAGE
  DIRECTORY --> CLINICAL
  CLINICAL --> COMMERCE
  COMMERCE --> ENGAGE
  CLINICAL --> ENGAGE
```

---

## 3. Business Flow — Tenant Signup (Auth)

```mermaid
flowchart TD
  A["Public POST /auth/tenant-signup<br/>(name, email, password)"] --> B{org exists?}
  B -->|yes| C["409 Conflict"]
  B -->|no| D["Create Organization (TRIAL / slug, limits)"]
  D --> E["Create CLINIC_ADMIN user + Role (permissions *)"]
  D --> F["Create default Clinic"]
  D --> G["Audit: audit.log created"]
  E --> H["201 — org + admin returned"]
  H --> I["Admin logs in → JWT (org-scoped)"]
  I --> J["RBAC check RbacScope.org"]
  J --> K["Seed data: doctors, services, products, packages"]
  K --> L["Patient register → login → appointments, clinical, billing"]
```

---

## 4. ER Diagram — Core Domains

```mermaid
erDiagram
  Organization ||--o{ Clinic : "has (multi-location)"
  Organization ||--o{ User : "has"
  Organization ||--o{ CmsPage : "owns"
  Clinic ||--o{ Doctor : "employs"
  Clinic ||--o{ Room : "has"

  User ||--o| UserRole : "has"
  UserRole ||--o{ RolePermission : "grants"

  Doctor ||--o{ DoctorSpecialty : "practices"
  Doctor ||--o{ DoctorSchedule : "available"
  Doctor ||--o{ DoctorLeave : "leave"
  Doctor ||--o| User : "login as"

  Specialty ||--o{ DoctorSpecialty : ""
  ServiceCategory ||--o{ Service : ""
  Service ||--o{ DoctorService : "offered by"

  Patient ||--o{ Appointment : "books"
  Patient ||--o{ Consultation : "attends"
  Patient ||--o{ MedicalRecord : "has"
  Patient ||--o{ Document : "holds"
  Patient ||--o{ Consent : "gives"
  Patient ||--o{ Review : "writes"
  Patient ||--o| Lead : "is tracked as"
  Doctor ||--o{ Appointment : "receives"
  Appointment ||--o| Consultation : "opens"

  Consultation ||--o{ Prescription : "issues"
  Consultation ||--o{ TreatmentPlan : "prescribes"
  Prescription ||--o{ PrescriptionItem : ""
  TreatmentPlan ||--o{ TreatmentSession : "course (EECP)"
  Package ||--o{ PackageEntitlement : ""
  Patient ||--o{ PackagePurchase : ""
  PackagePurchase ||--o{ PackageEntitlement : "remaining session count"

  ProductCategory ||--o{ Product : ""
  Product ||--o{ ProductVariant : ""
  Product ||--o{ ProductBatch : "" 
  Product ||--o{ DoctorRecommendation : "recommended (12)"
  Doctor ||--o{ DoctorRecommendation : ""
  Patient ||--o{ Order : "places"
  Order ||--o{ OrderItem : ""
  Product ||--o{ OrderItem : ""
  Order ||--o| Payment : "billed"
  Order ||--o| Invoice : "issued"
  Coupon ||--o{ Order : "applied"
  Order ||--o{ Refund : "refunded"

  NotificationTemplate ||--o{ Notification : ""
  User ||--o{ Notification : "receives"
  TreatmentPlan ||--o{ TreatmentSession : ""
  SkinAssessment ||--o| Patient : ""
  BeforeAfterImage ||--o| Patient : ""
  Appointment ||--o{ AppointmentStatusHistory : ""
  MedicalRecord ||--o{ Prescription : ""
```

---

## 5. DFD — Level 0 (Context)

```mermaid
flowchart LR
  P["Patient"]
  D["Doctor"]
  S["Staff (reception/nurse/pharmacy)"]
  A["Super Admin"]

  subgraph SYSTEM["ClinicCare System :3000 (API)"]
    CORE["Auth + RBAC + Tenants"]
    CLIN["Appointments · Clinical · Treatments · Skin"]
    COM["Catalog · Orders · Billing · Documents"]
    ENG["Notifications · Cms · Engagement · Search · Reports"]
  end

  P -->|"credentials, bookings, orders"| CORE
  D -->|"consult, prescribe, treatment"| CLIN
  S -->|"manage schedule, patients, inventory"| COM
  A -->|"tenant config, RBAC matrix"| CORE

  CORE -->|"JWT + roles"| P
  CLIN -->|"records, prescriptions"| D
  COM -->|"invoices, products"| S
  CORE -->|"org settings"| A

  CORE --> DB[("PostgreSQL")]
  CORE --> RED[("Redis")]
  CLIN --> DB
  COM --> DB
  ENG --> DB
  ENG --> NOTIF["Email / SMS / WhatsApp (via Notification service)"]
```

---

## 6. Sequence — Consultation → Prescription → Order (Commerce)

```mermaid
sequenceDiagram
  autonumber
  participant P as Patient
  participant W as Web client
  participant A as API (NestJS)
  participant Auth as Auth+RBAC guard
  participant PG as PostgreSQL

  P->>W: Log in (patient token, org-scoped)
  W->>A: GET /patients/me
  A->>Auth: validate JWT + RbacScope.org
  Auth-->>A: ok
  A-->>W: patient profile

  P->>W: Book appointment
  W->>A: POST /appointments
  A->>Auth: appointment.create (org-permission)
  A->>PG: create Appointment (status PENDING→CONFIRMED)
  A-->>W: 201

  P->>W: Attend consultation
  W->>A: POST /consultations (open from appointment)
  A-->>W: consultation created
  A->>PG: create TreatmentPlan + sessions (EECP package entitlement decrements)

  P->>W: Order recommended products
  W->>A: POST /orders (cart items)
  A->>PG: Order CREATED → PAYMENT_PENDING
  W->>A: POST /billing (pay)
  A->>PG: Payment PAID → Order PAID
  A-->>W: Invoice generated
```

---

## 7. Deployment / K8s Topology

```mermaid
flowchart TB
  subgraph CLUSTER["K8s — docker-desktop, namespace: cliniccare"]
    subgraph INFRA["State"]
      PGDEP["Deployment postgres<br/>image postgres:15-alpine"]
      PVC["PVC postgres-pvc"]
      RDDEP["Deployment redis<br/>image redis:7-alpine"]
    end
    subgraph APP["Application"]
      APID["Deployment api<br/>image cliniccare/api:dev"]
      WEBD["Deployment web<br/>image cliniccare/web:dev"]
    end
    subgraph CP["Config & Scaling"]
      CM["ConfigMaps<br/>nestjs-config, nextjs-config"]
      SEC["Secrets<br/>postgres-credentials, api-secrets"]
      HPA["HPA api-hpa / web-hpa<br/>(cpu + memory)"]
    end
    subgraph SERVI["Services"]
      PGS["Service postgres :5432"]
      RDS["Service redis :6379"]
      APIS["Service api :3000"]
      WEBS["Service web :3100"]
    end
    subgraph ING["Ingress nginx"]
      INGR["cliniccare-ingress<br/>api.cliniccare.local<br/>web.cliniccare.local"]
    end
  end

  INGR --> APIS
  INGR --> WEBS
  APID --> APIS
  WEBD --> WEBS
  APID --> PGS
  APID --> RDS
  PGDEP --> PGS
  RDDEP --> RDS
  PGDEP --> PVC
  APID --> SEC
  APID --> CM
  WEBD --> CM
  HPA --> APID
  HPA --> WEBD
```

---

## 8. Tenant Theming — Web Runtime (middleware → theme)

```mermaid
sequenceDiagram
  autonumber
  participant B as Browser (subdomain)
  participant MW as next proxy.ts
  participant L as lib/tenant-data.ts (Prisma + React cache)
  participant DB as PostgreSQL
  participant TP as TenantThemeProvider
  participant UV as UI view (hero/banner/title)

  B->>MW: GET / (Host: cliniccare-demo.localhost)
  MW->>MW: parse subdomain from raw Host (+ ?tenant dev fallback)
  MW->>B: set x-tenant-subdomain header
  B->>L: getTenantBySubdomain('cliniccare-demo')
  L->>DB: find Organization by domain/subdomain
  DB-->>L: org (name, domain, settings, logo)
  L-->>TP: org settings
  TP->>TP: settings → CSS vars (--primary, --radius, brand)
  TP-->>UV: tenant name, hero, banner, title/metadata
```

---

## 9. RBAC Matrix (implemented roles)

```mermaid
flowchart TD
  SA["SUPER_ADMIN<br/>global, all scopes"]
  CA["CLINIC_ADMIN<br/>org-wide"]
  AD["ADMIN"]
  DR["DOCTOR"]
  NUR["NURSE"]
  RC["RECEPTIONIST"]
  PH["PHARMACIST"]
  AC["ACCOUNTANT"]
  CM["CONTENT_MANAGER"]
  PT["PATIENT"]

  SA --> CA
  CA --> AD
  AD --> DR
  AD --> NUR
  AD --> RC
  AD --> PH
  AD --> AC
  AD --> CM
  AD --> PT

  DR -.->|"medical_record.write, prescription.*"|PT
  PH -.->|"inventory.*, orders"|PT
  RC -.->|"appointment.*, patient.read"|PT
  AC -.->|"billing.*, report.view"|PT
  CM -.->|"cms.*"|PT
```
