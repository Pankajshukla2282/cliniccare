const base = (process.env.E2E_API_URL || 'http://localhost:3100/api/v1').replace(/\/$/, '');
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const organizationId = Number(process.env.E2E_ORG_ID);
const doctorId = Number(process.env.E2E_DOCTOR_ID);
const clinicId = Number(process.env.E2E_CLINIC_ID);
if (!email || !password || !organizationId || !doctorId || !clinicId) {
  throw new Error('Set E2E_EMAIL, E2E_PASSWORD, E2E_ORG_ID, E2E_DOCTOR_ID and E2E_CLINIC_ID');
}

async function call(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path} -> ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

const login = await call('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
const token = login.accessToken;
if (!token) throw new Error('Login did not return an access token');
const auth = { Authorization: `Bearer ${token}` };

const patient = await call('/patients', { method: 'POST', headers: auth, body: JSON.stringify({ organizationId }) });
const patientId = patient.id;
if (!patientId) throw new Error('Patient creation failed');

const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const slots = await call(`/appointments/slots?organizationId=${organizationId}&doctorId=${doctorId}&date=${tomorrow}`, { headers: auth });
const slot = (slots.slots || []).find((item) => item.available);
if (!slot) throw new Error('No appointment slot available for E2E workflow');

const appointment = await call('/appointments', { method: 'POST', headers: { ...auth, 'Idempotency-Key': `e2e-appt-${Date.now()}` }, body: JSON.stringify({ patientId, doctorId, clinicId, appointmentDate: tomorrow, startTime: slot.start, endTime: slot.end }) });

const queue = await call('/queue/tickets', { method: 'POST', headers: { ...auth, 'Idempotency-Key': `e2e-queue-${Date.now()}` }, body: JSON.stringify({ patientId, clinicId, appointmentId: appointment.id, serviceDate: tomorrow }) });

const consultation = await call('/consultations', { method: 'POST', headers: { ...auth, 'Idempotency-Key': `e2e-consult-${Date.now()}` }, body: JSON.stringify({ patientId, doctorId, clinicId, appointmentId: appointment.id, chiefComplaint: 'E2E test', assessment: 'E2E test', diagnosis: 'E2E test' }) });

const prescription = await call('/prescriptions', { method: 'POST', headers: { ...auth, 'Idempotency-Key': `e2e-rx-${Date.now()}` }, body: JSON.stringify({ patientId, doctorId, consultationId: consultation.id, title: 'E2E test', prescriptionItems: [{ name: 'E2E test medicine', dosage: '1', frequency: 'OD', duration: '1 day' }] }) });

const lab = await call('/labs/reports', { method: 'POST', headers: { ...auth, 'Idempotency-Key': `e2e-lab-${Date.now()}` }, body: JSON.stringify({ patientId, consultationId: consultation.id, doctorId, testName: 'E2E Test', result: 'Normal' }) });

const invoice = await call('/invoices', { method: 'POST', headers: { ...auth, 'Idempotency-Key': `e2e-invoice-${Date.now()}` }, body: JSON.stringify({ patientId, doctorId, amount: 100 }) });
const payment = await call('/payments', { method: 'POST', headers: { ...auth, 'Idempotency-Key': `e2e-payment-${Date.now()}` }, body: JSON.stringify({ patientId, appointmentId: appointment.id, amount: 100, status: 'SUCCESS', method: 'UPI' }) });
const history = await call(`/patients/${patientId}/dashboard`, { headers: auth });

console.log(JSON.stringify({ ok: true, patientId, appointmentId: appointment.id, queueTicketId: queue.id, consultationId: consultation.id, prescriptionId: prescription.id, labReportId: lab.id, invoiceId: invoice.id, paymentId: payment.id, historyKeys: Object.keys(history) }, null, 2));
