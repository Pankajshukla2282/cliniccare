# ClinicCare - Request for Proposal (RFP)

Version 1.0 | Issue date: <today> | Response deadline: 30 calendar days
Issued by: ClinicCare Procurement    Contact: procurement@cliniccare.local

## 1. Purpose and intent

ClinicCare is seeking qualified vendors to design, build, and deliver the
**ClinicCare SaaS platform** (white-label, multi-tenant digital clinic platform).
The winning vendor will act under the paired Statement of Work (docs/sow.md) and
the functional/commercial anchors in docs/brd.md and docs/technical-design.md.
This RFP is intent-to-negotiate; it does not bind ClinicCare to accept any bid.

## 2. Background for bidders

ClinicCare operates (or will operate) multiple clinic brands: EECP/EECP+
cardio-rehabilitation therapy, metallic-detox (EECP/EECP+ variant), cosmetic /
skin care, and doctor-recommended products. Each clinic must run its entire
business on software: front desk, consultations, prescriptions, treatment
courses, product orders, invoices, and payments — while ClinicCare owns a
single platform and each clinic is an isolated, branded tenant.

## 3. Scope of work (summary; full detail in docs/sow.md §2-3)

Bidders must demonstrate the ability to deliver, on Kubernetes only:

- G1-G6 of the BRD (goal scope): tenant onboarding, branded subdomains,
  org-scoped RBAC, full patient journey, two-doctor EECP/skin model, and
  isolation-by-design.
- The technical baseline fully described in docs/technical-design.md: NestJS +
  Prisma + Next.js 16 + Postgres/Redis + k8s/HPA.
- All BRD P0 functional + NFR-1..8 non-functional requirements.

## 4. Content and format of proposals

Each vendor shall submit:

1. A single PDF (max 40 pages, plus appendices) and an editable copy of
   the priced SOW spreadsheet.
2. Company overview, relevant EECP/clinic/health-record or multi-tenant SaaS
   experience, and 2 references.
3. Team composition + qualifications (lead architect, full-stack, DevOps).
4. Work breakdown with schedule tied to docs/sow.md §5 milestones and the
   ceremony on payment schedule (sow.md §6).
5. Fixed-price quotation broken into D1-D5 deliverables plus optional line
   items; statement on monthly SaaS anchor and IP ownership.
6. Environment/security approach: tenant isolation, secrets handling, RBAC
   matrix, auditability, data residency (must be in-cluster Postgres).
7. Risks, assumptions, exclusions, and acceptance-test plan aligned to
   sow.md §7.

## 5. Evaluation criteria (weights)

| Criterion | Weight |
|-----------|--------|
| Functional coverage (BRD P0 matrix) | 30% |
| Technical feasibility (TDD alignment) | 25% |
| Price + payment terms | 20% |
| Experience / references | 10% |
| Team quality + DevOps skills | 10% |
| Security & tenant-isolation rigor | 5% |

## 6. Process and timeline

- RFP issue: Day 0. Clarification window: Day 0-10 (questions in writing).
- Bid deadline: Day 30. Shortlist + presentations: Day 35-40.
- Award intent + contract (SOW-sign): Day 45. Kick-off (M0): Day 50.

## 7. Terms and conditions (abridged)

- Confidentiality: NDA must be executed before receiving docs/technical-design.md.
- IP: all custom work-product transfers to ClinicCare on final payment.
- Warranty: 90-day defect-fix warranty post final acceptance.
- Support: 12-month tiered support (P1 within 4h, P2 1 business day, P3 backlog).
- Compliance: vendor must follow ClinicCare secrets policy (no committed
  secrets; CHANGE_ME placeholders in sample manifests).

## 8. Contact and submission

Submit proposals (subject: "RFP ClinicCare SaaS") to procurement@cliniccare.local
by Day 30. Late bids not accepted. ClinicCare reserves the right to request a
proof-of-concept for shortlisted vendors at cost.
