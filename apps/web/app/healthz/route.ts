export async function GET() {
  return Response.json({ status: 'ok', service: 'cliniccare-web', time: new Date().toISOString() });
}
