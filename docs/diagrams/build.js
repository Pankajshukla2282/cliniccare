const fs = require("fs");
const path = require("path");

const dir = __dirname;
const names = [
  "d01-container.html",
  "d02-modules.html",
  "d03-flow-signup.html",
  "d04-er.html",
  "d05-dfd.html",
  "d06-sequence-consult.html",
  "d07-deployment.html",
  "d08-theming.html",
  "d09-rbac.html"
];
const titles = [
  "1 \u00B7 Container / System",
  "2 \u00B7 Modules / Block Diagram",
  "3 \u00B7 Flow \u2014 Tenant Signup + Booking",
  "4 \u00B7 ER \u2014 Core Prisma Models",
  "5 \u00B7 DFD \u2014 Level 0 (Context)",
  "6 \u00B7 Sequence \u2014 Consultation \u2192 Prescription \u2192 Order",
  "7 \u00B7 Deployment \u2014 Kubernetes",
  "8 \u00B7 Sequence \u2014 Tenant Theming",
  "9 \u00B7 RBAC \u2014 Role Hierarchy"
];

const css = `*{box-sizing:border-box}
:root{--bg:#f6f8fa;--fg:#1f2328;--card:#fff;--border:#d0d7de;--muted:#57606a;--accent:#0969da}
body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
     background:var(--bg);color:var(--fg);line-height:1.55}
header{position:sticky;top:0;z-index:10;background:var(--card);border-bottom:1px solid var(--border);
       padding:10px 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
header h1{font-size:16px;margin:0;font-weight:650;flex:1 1 auto}
nav{display:flex;gap:8px;flex-wrap:wrap}
nav a{color:var(--accent);text-decoration:none;font-size:13px;white-space:nowrap}
nav a:hover{text-decoration:underline}
main{max-width:1180px;margin:0 auto;padding:20px;overflow-x:auto}
.desc{color:var(--muted);font-size:14px;margin:0 0 14px}
.panel{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:16px;
       overflow-x:auto}
.toolbar{margin:0 0 10px}
button{font-size:12px;padding:4px 10px;border:1px solid var(--border);border-radius:6px;
       background:var(--card);color:var(--accent);cursor:pointer}
button:hover{border-color:var(--accent)}
footer{color:var(--muted);font-size:11px;text-align:center;padding:20px}`;

const page = (title, desc, mermaid) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ClinicCare \u2014 ${title}</title>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script>mermaid.initialize({startOnLoad:true,theme:"default",
  themeVariables:{fontFamily:"system-ui,-apple-system,\\"Segoe UI\\",Roboto,sans-serif"}});</script>
<style>${css}</style>
</head>
<body>
<header>
<h1>ClinicCare \u2014 ${title}</h1>
<nav>
<a href="index.html">&#8592; All diagrams</a>
<a href="../architecture-diagrams.md">.md source</a>
<a href="../architecture-diagrams.drawio">.drawio</a>
</nav>
</header>
<main>
<p class="desc">${desc}</p>
<div class="toolbar"><button onclick="copySrc(this)">Copy mermaid source</button></div>
<div class="panel"><pre class="mermaid">
${mermaid}
</pre></div>
</main>
<footer>ClinicCare \u2014 generated from the implemented codebase  \u00B7 docs/diagrams/</footer>
<script>
function copySrc(btn){
  var pre = document.querySelector(".panel .mermaid");
  var txt = pre.textContent;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).then(function(){btn.textContent="Copied!";});
  } else {
    window.prompt("Copy mermaid source:", txt);
  }
}
</script>
</body>
</html>
`;

const descs = [
  "Users (patient/doctor/staff/super admin) reach the platform through the NGINX ingress; the Web (Next.js 16, :3100) and API (NestJS, :3000) run in the K8s namespace cliniccare against PostgreSQL 15 + Redis; external providers (S3/SMTP/SMS/payments/video) are configured via secrets but not yet wired.",
  "All 21 app.module imports grouped into 5 concern clusters: Platform core (auth, users, tenants, audit+RBAC, prisma), Directory (clinics, doctors, catalog), Clinical (patients, appointments, clinical, documents, treatments, skin), Commerce (products, orders, billing), Engagement (notifications, cms, engagement, search, reports) \u2014 all inside one NestJS app.module.",
  "Public POST /auth/tenant-signup (name, email, password) \u2192 create Organization (TRIAL) + CLINIC_ADMIN user + default Clinic + seed (doctors, services, products) \u2192 201 + org-scoped JWT \u2192 RBAC checks at every org-scoped call.",
  "Core Prisma model groups and FK relationships: Organization/Clinic/Directory \u2192 User/Role/RBAC, Doctor (specialty/schedule/leave) + Patient (EMR/consult/prescription/treatments/skin), Commerce (product/order/billing/coupon/refund), Engagement (notifications/cms), all org-scoped.",
  "External entities (Patient, Doctor, Staff, Super Admin) flow into the ClinicCare system :3000 \u2192 core subsystems (Auth+RBAC, Clinical, Commerce, Engagement) \u2192 PostgreSQL + Redis; no cross-tenant data access.",
  "Patient books appointment \u2192 doctor consultation \u2192 prescription + treatment plan \u2192 order + payment \u2192 invoice; each step guarded by RBAC permission checks (org scoped).",
  "Namespace cliniccare on docker-desktop: postgres + redis + api + web deployments, HPA, ConfigMaps/Secrets, ingress (api/web.cliniccare.local), PVC for postgres \u2014 cluster topology.",
  "Middleware parses subdomain \u2192 Prisma tenant lookup (React cache) \u2192 CSS-variable theme provider \u2192 per-tenant branded UI (cliniccare-demo.localhost).",
  "SUPER_ADMIN (global, all scopes) \u2192 CLINIC_ADMIN/CADMIN \u2192 org-scoped roles (DOCTOR, NURSE, RECEPTIONIST, PHARMACIST, ACCOUNTANT, CONTENT_MANAGER, PATIENT); RBAC scope enforced as RbacScope.org \u2014 cross-tenant access is a 404."
];

for (let i = 0; i < 9; i++) {
  const src = fs.readFileSync(path.join(dir, ("src" + String(i+1).padStart(2,"0") + ".mermaid")), "utf8");
  const html = page(titles[i], descs[i], src);
  fs.writeFileSync(path.join(dir, names[i]), html);
  console.log("wrote " + names[i] + "  (" + html.length + " bytes)");
}

// clean up the stale misnamed page
const stale = path.join(dir, "d03-tenant-signup.html");
if (fs.existsSync(stale)) {
  fs.unlinkSync(stale);
  console.log("removed stale " + stale);
}

console.log("done");
