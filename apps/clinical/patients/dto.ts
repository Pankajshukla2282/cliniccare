export class CreatePatientDto {
  patientNumber!: string;
  userId?: number;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}

export class UpdatePatientDto {
  patientNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}