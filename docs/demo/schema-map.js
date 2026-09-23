/* ClinicCare Proposal Demo — schema-alignment manifest.
 * Source of truth: the uploaded BRD/TDD/SOW/RFP and the production API/schema architecture.
 * Exact Prisma model names are intentionally isolated here so the UI never invents its own data contract.
 */
window.CLINICCARE_SCHEMA = {
  tenancy: [
    {key:'organization',label:'Organization / Tenant',domain:'SaaS',scope:'platform',relations:['organizationMembership','clinic','role','rolePermission']},
    {key:'organizationMembership',label:'Organization Membership',domain:'RBAC',scope:'organization',relations:['user','organization','clinic']},
    {key:'user',label:'User',domain:'RBAC',scope:'organization',relations:['organizationMembership','userRole']},
    {key:'userRole',label:'User Role Assignment',domain:'RBAC',scope:'organization/clinic',relations:['user','role','clinic']},
    {key:'role',label:'Role',domain:'RBAC',scope:'platform/organization',relations:['rolePermission']},
    {key:'rolePermission',label:'Role Permission',domain:'RBAC',scope:'role',relations:['role']},
    {key:'clinic',label:'Clinic / Branch',domain:'Operations',scope:'organization',relations:['organization','doctor','patient','appointment']}
  ],
  clinical: [
    {key:'patient',label:'Patient',domain:'Clinical',scope:'organization',relations:['clinic','appointment','consultation','prescription','treatment','document','invoice']},
    {key:'doctor',label:'Doctor',domain:'Clinical',scope:'organization',relations:['clinic','schedule','appointment','consultation']},
    {key:'schedule',label:'Doctor Schedule',domain:'Scheduling',scope:'clinic',relations:['doctor','appointment']},
    {key:'appointment',label:'Appointment / Queue',domain:'Patient Journey',scope:'organization',relations:['patient','doctor','clinic']},
    {key:'consultation',label:'Consultation / Visit',domain:'Clinical',scope:'organization',relations:['patient','doctor','diagnosis','prescription','treatment']},
    {key:'diagnosis',label:'Diagnosis',domain:'Clinical',scope:'organization',relations:['consultation','patient']},
    {key:'prescription',label:'Prescription',domain:'Clinical',scope:'organization',relations:['patient','consultation','product']},
    {key:'medicalRecord',label:'Medical Record',domain:'Clinical',scope:'organization',relations:['patient','document']},
    {key:'treatment',label:'Treatment',domain:'Clinical',scope:'organization',relations:['patient','doctor','treatmentCourse','service']},
    {key:'treatmentCourse',label:'EECP / EECP+ Course',domain:'Therapy',scope:'organization',relations:['patient','treatment','appointment']},
    {key:'skinAssessment',label:'Skin Assessment',domain:'Skin Care',scope:'organization',relations:['patient','recommendation']},
    {key:'recommendation',label:'Recommendation',domain:'Clinical/Commerce',scope:'organization',relations:['patient','product','service']},
    {key:'document',label:'Document',domain:'Platform/Clinical',scope:'organization',relations:['patient','consent']},
    {key:'consent',label:'Consent',domain:'Clinical',scope:'organization',relations:['patient','document']}
  ],
  commerce: [
    {key:'service',label:'Service / Catalog Item',domain:'Catalog',scope:'organization',relations:['clinic','doctor','treatment','invoice']},
    {key:'product',label:'Product / Catalog Item',domain:'Catalog',scope:'organization',relations:['inventory','orderItem','prescription']},
    {key:'productCategory',label:'Product / Service Category',domain:'Catalog',scope:'organization',relations:['product','service']},
    {key:'inventory',label:'Inventory',domain:'Commerce',scope:'clinic',relations:['product','clinic']},
    {key:'order',label:'Order',domain:'Commerce',scope:'organization',relations:['patient','orderItem','invoice']},
    {key:'orderItem',label:'Order Line Item',domain:'Commerce',scope:'order',relations:['order','product','service']}
  ],
  billing: [
    {key:'invoice',label:'Invoice',domain:'Billing',scope:'organization',relations:['patient','order','payment']},
    {key:'payment',label:'Payment Ledger Entry',domain:'Billing',scope:'organization',relations:['invoice','patient']},
    {key:'refund',label:'Refund',domain:'Billing',scope:'organization',relations:['payment','invoice']}
  ],
  engagement: [
    {key:'lead',label:'Lead / Acquisition',domain:'Engagement',scope:'organization',relations:['patient','appointment']},
    {key:'followUp',label:'Follow-up',domain:'Engagement',scope:'organization',relations:['patient','appointment','notification']},
    {key:'review',label:'Review / Feedback',domain:'Engagement',scope:'organization',relations:['patient','appointment']},
    {key:'notification',label:'Notification',domain:'Platform',scope:'organization',relations:['user','patient']},
    {key:'notificationTemplate',label:'Notification Template',domain:'Platform',scope:'organization',relations:['notification']}
  ],
  content: [
    {key:'cmsPage',label:'CMS Page',domain:'Content',scope:'organization',relations:[]},
    {key:'article',label:'Article',domain:'Content',scope:'organization',relations:[]},
    {key:'faq',label:'FAQ',domain:'Content',scope:'organization',relations:[]}
  ],
  governance: [
    {key:'auditLog',label:'Audit Log',domain:'Governance',scope:'organization',relations:['user']},
    {key:'idempotencyRecord',label:'Idempotency Record',domain:'Reliability',scope:'organization',relations:[]}
  ]
};
window.CLINICCARE_MODULES = [
 {id:'dashboard',label:'Executive Dashboard',group:'OVERVIEW',icon:'◈'},
 {id:'value',label:'Hospital Value & ROI',group:'OVERVIEW',icon:'₹'},
 {id:'patients',label:'Patients',group:'PATIENT JOURNEY',icon:'P'},
 {id:'appointments',label:'Appointments & Queue',group:'PATIENT JOURNEY',icon:'Q'},
 {id:'leads',label:'Leads & Follow-ups',group:'PATIENT JOURNEY',icon:'L'},
 {id:'reviews',label:'Reviews & Engagement',group:'PATIENT JOURNEY',icon:'★'},
 {id:'consultations',label:'Consultations / Visits',group:'CLINICAL',icon:'C'},
 {id:'prescriptions',label:'Prescriptions',group:'CLINICAL',icon:'Rx'},
 {id:'records',label:'Medical Records',group:'CLINICAL',icon:'MR'},
 {id:'labs',label:'Laboratory / Diagnostics',group:'CLINICAL',icon:'LAB'},
 {id:'tele',label:'Teleconsultation',group:'CLINICAL',icon:'T'},
 {id:'treatments',label:'Treatments & EECP+',group:'CLINICAL',icon:'TR'},
 {id:'documents',label:'Documents & Consents',group:'CLINICAL',icon:'D'},
 {id:'skincare',label:'Skin Care',group:'CLINICAL',icon:'S'},
 {id:'billing',label:'Billing & Payments',group:'REVENUE',icon:'₹'},
 {id:'orders',label:'Orders & Cart',group:'REVENUE',icon:'O'},
 {id:'inventory',label:'Products & Inventory',group:'REVENUE',icon:'I'},
 {id:'catalog',label:'Services & Categories',group:'REVENUE',icon:'CAT'},
 {id:'doctors',label:'Doctors & Schedules',group:'PEOPLE & CONTROL',icon:'DR'},
 {id:'organizations',label:'Organizations & Clinics',group:'PEOPLE & CONTROL',icon:'ORG'},
 {id:'users',label:'Users & RBAC',group:'PEOPLE & CONTROL',icon:'U'},
 {id:'notifications',label:'Notifications',group:'PEOPLE & CONTROL',icon:'N'},
 {id:'cms',label:'CMS / Public Content',group:'GROWTH',icon:'CMS'},
 {id:'reports',label:'Reports & Search',group:'INSIGHTS',icon:'BI'},
 {id:'monthly',label:'Monthly Totals',group:'INSIGHTS',icon:'Σ'},
 {id:'audit',label:'Audit & Reliability',group:'GOVERNANCE',icon:'A'},
 {id:'schema',label:'API / Schema Map',group:'GOVERNANCE',icon:'DB'},
 {id:'settings',label:'Tenant & Environment',group:'GOVERNANCE',icon:'⚙'}
];
