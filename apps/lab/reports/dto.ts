export class CreateReportDto {
  organizationId!: number;
  patientId!: number;
  consultationId?: number;
  doctorId?: number;
  testName!: string;
  labName?: string;
  result?: string;
  units?: string;
  referenceRange?: string;
}