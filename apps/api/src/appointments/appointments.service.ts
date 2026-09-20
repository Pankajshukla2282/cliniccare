import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, Prisma } from '../generated/prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { BookAppointmentDto, CancelAppointmentDto, RescheduleAppointmentDto, UpdateAppointmentStatusDto } from './dto';

function toMinutes(t: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) throw new BadRequestException(`Invalid time format: ${t} (expected HH:MM)`);
  return Number(m[1]) * 60 + Number(m[2]);
}

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(organizationId: number, filters: { doctorId?: number; patientId?: number; clinicId?: number; date?: string; status?: AppointmentStatus }) {
    return this.prisma.appointment.findMany({
      where: {
        patient: { organizationId },
        ...(filters.doctorId ? { doctorId: filters.doctorId } : {}),
        ...(filters.patientId ? { patientId: filters.patientId } : {}),
        ...(filters.clinicId ? { clinicId: filters.clinicId } : {}),
        ...(filters.date ? { appointmentDate: new Date(filters.date) } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      include: {
        patient: { include: { user: { select: { firstName: true, lastName: true } } } },
        doctor: { include: { user: { select: { firstName: true, lastName: true } } } },
        service: true,
      },
      orderBy: [{ appointmentDate: 'asc' }, { startTime: 'asc' }],
    });
  }

  private async verifyAppointmentBelongsToOrg(appointmentId: number, organizationId: number) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, patient: { organizationId } },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }

  async book(organizationId: number, dto: BookAppointmentDto, performedBy?: number) {
    const date = new Date(dto.appointmentDate);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Invalid appointmentDate');
    const start = toMinutes(dto.startTime);
    const end = toMinutes(dto.endTime);
    if (end <= start) throw new BadRequestException('endTime must be after startTime');

    const [patient, doctor] = await Promise.all([
      this.prisma.patient.findUnique({ where: { id: dto.patientId, organizationId } }),
      this.prisma.doctor.findFirst({ where: { id: dto.doctorId, clinic: { organizationId } } }),
    ]);
    if (!patient) throw new NotFoundException('Patient not found');
    if (!doctor || doctor.status !== 'ACTIVE') throw new BadRequestException('Doctor not available');
    if (dto.clinicId) {
      const clinic = await this.prisma.clinic.findFirst({ where: { id: dto.clinicId, organizationId } });
      if (!clinic) throw new NotFoundException('Clinic not found');
    }
    if (dto.serviceId) {
      const service = await this.prisma.service.findFirst({ where: { id: dto.serviceId, organizationId } });
      if (!service) throw new NotFoundException('Service not found');
    }

    const appointment = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Leave check
      const leave = await tx.doctorLeave.findUnique({
        where: { doctorId_date: { doctorId: dto.doctorId, date } },
      });
      if (leave) throw new BadRequestException('Doctor is on leave on this date');

      // Clinic holiday check
      if (dto.clinicId) {
        const holiday = await tx.clinicHoliday.findUnique({
          where: { clinicId_date: { clinicId: dto.clinicId, date } },
        });
        if (holiday) throw new BadRequestException('Clinic is closed on this date');
      }

      // Working-hours check (enforced only when schedules are defined)
      const dayOfWeek = new Date(dto.appointmentDate + 'T00:00:00Z').getUTCDay();
      const schedules = await tx.doctorSchedule.findMany({
        where: { doctorId: dto.doctorId, dayOfWeek, isWorkingDay: true },
      });
      if (schedules.length > 0) {
        const inside = schedules.some(
          (s) => start >= toMinutes(s.startTime) && end <= toMinutes(s.endTime),
        );
        if (!inside) throw new BadRequestException('Outside doctor working hours');
      }

      // Overlap check against active bookings (honours doctor buffer time)
      const buffer = doctor.slotBufferMinutes ?? 0;
      const existing = await tx.appointment.findMany({
        where: {
          doctorId: dto.doctorId,
          appointmentDate: date,
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
      });
      const clash = existing.some(
        (a) => start < toMinutes(a.endTime) + buffer && toMinutes(a.startTime) - buffer < end,
      );
      if (clash) throw new BadRequestException('Slot already booked');

      const appointment = await tx.appointment.create({
        data: {
          patientId: dto.patientId,
          doctorId: dto.doctorId,
          clinicId: dto.clinicId,
          serviceId: dto.serviceId,
          appointmentDate: date,
          startTime: dto.startTime,
          endTime: dto.endTime,
          type: dto.type ?? 'IN_PERSON',
          notes: dto.notes,
        },
      });
      await tx.appointmentStatusHistory.create({
        data: { appointmentId: appointment.id, toStatus: 'PENDING', changedBy: performedBy, note: 'Booked' },
      });
      return appointment;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    try {
      await this.audit.log({
        entityType: 'appointment',
        entityId: appointment.id,
        action: 'CREATE',
        performedBy,
        purpose: 'appointment_booking',
      });
    } catch {
      // Audit must never fail a booking
    }
    return appointment;
  }

  async reschedule(id: number, organizationId: number, dto: RescheduleAppointmentDto, performedBy?: number) {
    const appointment = await this.verifyAppointmentBelongsToOrg(id, organizationId);
    if (appointment.status === 'CANCELLED' || appointment.status === 'COMPLETED') {
      throw new BadRequestException(`Cannot reschedule a ${appointment.status.toLowerCase()} appointment`);
    }
    const date = new Date(dto.appointmentDate);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Invalid appointmentDate');
    const start = toMinutes(dto.startTime);
    const end = toMinutes(dto.endTime);
    if (end <= start) throw new BadRequestException('endTime must be after startTime');

    const doctor = await this.prisma.doctor.findUnique({ where: { id: appointment.doctorId } });
    if (!doctor || doctor.status !== 'ACTIVE') throw new BadRequestException('Doctor not available');

    const updated = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Leave check
      const leave = await tx.doctorLeave.findUnique({
        where: { doctorId_date: { doctorId: appointment.doctorId, date } },
      });
      if (leave) throw new BadRequestException('Doctor is on leave on this date');

      // Clinic holiday check
      if (appointment.clinicId) {
        const holiday = await tx.clinicHoliday.findUnique({
          where: { clinicId_date: { clinicId: appointment.clinicId, date } },
        });
        if (holiday) throw new BadRequestException('Clinic is closed on this date');
      }

      // Overlap check (exclude self)
      const buffer = doctor.slotBufferMinutes ?? 0;
      const existing = await tx.appointment.findMany({
        where: {
          doctorId: appointment.doctorId,
          appointmentDate: date,
          status: { in: ['PENDING', 'CONFIRMED'] },
          id: { not: id },
        },
      });
      const clash = existing.some(
        (a) => start < toMinutes(a.endTime) + buffer && toMinutes(a.startTime) - buffer < end,
      );
      if (clash) throw new BadRequestException('Slot already booked');

      const next = await tx.appointment.update({
        where: { id },
        data: { appointmentDate: date, startTime: dto.startTime, endTime: dto.endTime },
      });
      await tx.appointmentStatusHistory.create({
        data: {
          appointmentId: id,
          fromStatus: appointment.status,
          toStatus: appointment.status,
          changedBy: performedBy,
          note: dto.note ?? `Rescheduled from ${appointment.appointmentDate.toISOString().slice(0, 10)} ${appointment.startTime}`,
        },
      });
      return next;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    try {
      await this.audit.log({
        entityType: 'appointment',
        entityId: id,
        action: 'RESCHEDULE',
        performedBy,
        changes: { from: { date: appointment.appointmentDate, time: appointment.startTime }, to: { date, time: dto.startTime } },
        purpose: 'appointment_reschedule',
      });
    } catch {}
    return updated;
  }

  async cancel(id: number, organizationId: number, dto: CancelAppointmentDto, performedBy?: number) {
    const appointment = await this.verifyAppointmentBelongsToOrg(id, organizationId);
    if (appointment.status === 'CANCELLED' || appointment.status === 'COMPLETED') {
      throw new BadRequestException(`Appointment already ${appointment.status.toLowerCase()}`);
    }
    const updated = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const next = await tx.appointment.update({ where: { id }, data: { status: 'CANCELLED' } });
      await tx.appointmentStatusHistory.create({
        data: {
          appointmentId: id,
          fromStatus: appointment.status,
          toStatus: 'CANCELLED',
          changedBy: performedBy,
          note: dto.reason,
        },
      });
      return next;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    try {
      await this.audit.log({
        entityType: 'appointment',
        entityId: id,
        action: 'CANCEL',
        performedBy,
        changes: { from: appointment.status, to: 'CANCELLED', reason: dto.reason },
        purpose: 'appointment_cancellation',
      });
    } catch {}
    return updated;
  }

  async availableSlots(organizationId: number, doctorId: number, date: string, serviceId?: number) {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid date');
    const doctor = await this.prisma.doctor.findFirst({ where: { id: doctorId, clinic: { organizationId } } });
    if (!doctor || doctor.status !== 'ACTIVE') throw new BadRequestException('Doctor not available');

    // Check leave
    const leave = await this.prisma.doctorLeave.findUnique({
      where: { doctorId_date: { doctorId, date: d } },
    });
    if (leave) return { slots: [] as { start: string; end: string; available: boolean }[], reason: 'Doctor is on leave' };

    // Get schedule for day
    const dayOfWeek = d.getUTCDay();
    const schedules = await this.prisma.doctorSchedule.findMany({
      where: { doctorId, dayOfWeek, isWorkingDay: true },
    });
    if (schedules.length === 0) return { slots: [] as { start: string; end: string; available: boolean }[], reason: 'No schedule defined for this day' };

    // Get duration from service if provided
    let duration = 30;
    if (serviceId) {
      const service = await this.prisma.service.findFirst({ where: { id: serviceId, organizationId } });
      if (service) duration = service.durationMinutes;
    }

    const buffer = doctor.slotBufferMinutes ?? 0;
    const existing = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        appointmentDate: d,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      select: { startTime: true, endTime: true },
    });

    const slots: { start: string; end: string; available: boolean }[] = [];
    for (const sched of schedules) {
      const schedStart = toMinutes(sched.startTime);
      const schedEnd = toMinutes(sched.endTime);
      // Handle break
      const breakStart = sched.breakStart ? toMinutes(sched.breakStart) : null;
      const breakEnd = sched.breakEnd ? toMinutes(sched.breakEnd) : null;

      for (let t = schedStart; t + duration <= schedEnd; t += duration) {
        const slotEnd = t + duration;
        // Skip if overlaps break
        if (breakStart !== null && breakEnd !== null && t < breakEnd && slotEnd > breakStart) continue;
        // Check overlap with existing
        const occupied = existing.some(
          (a) => t < toMinutes(a.endTime) + buffer && toMinutes(a.startTime) - buffer < slotEnd,
        );
        const HH = (m: number) => String(Math.floor(m / 60)).padStart(2, '0');
        const MM = (m: number) => String(m % 60).padStart(2, '0');
        slots.push({ start: `${HH(t)}:${MM(t)}`, end: `${HH(slotEnd)}:${MM(slotEnd)}`, available: !occupied });
      }
    }
    return { slots, doctorId, date, duration };
  }

  async setStatus(id: number, organizationId: number, dto: UpdateAppointmentStatusDto, performedBy?: number) {
    const appointment = await this.verifyAppointmentBelongsToOrg(id, organizationId);
    const updated = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const next = await tx.appointment.update({ where: { id }, data: { status: dto.status } });
      await tx.appointmentStatusHistory.create({
        data: {
          appointmentId: id,
          fromStatus: appointment.status,
          toStatus: dto.status,
          changedBy: performedBy,
          note: dto.note,
        },
      });
      return next;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    try {
      await this.audit.log({
        entityType: 'appointment',
        entityId: id,
        action: 'UPDATE',
        performedBy,
        changes: { from: appointment.status, to: dto.status },
        purpose: 'appointment_status_change',
      });
    } catch {
      // Audit must never fail a status change
    }
    return updated;
  }
}
