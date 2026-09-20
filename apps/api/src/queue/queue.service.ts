import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateQueueTicketDto } from './dto';

@Injectable()
export class QueueService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async issue(organizationId: number, dto: CreateQueueTicketDto, performedBy: number) {
    const patient = await this.prisma.patient.findFirst({ where: { id: dto.patientId, organizationId } });
    const clinic = await this.prisma.clinic.findFirst({ where: { id: dto.clinicId, organizationId } });
    if (!patient || !clinic) throw new NotFoundException('Patient or clinic not found');
    const serviceDate = dto.serviceDate ? new Date(dto.serviceDate) : new Date();
    serviceDate.setHours(0,0,0,0);
    const ticket = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const last = await tx.queueTicket.findFirst({ where: { clinicId: dto.clinicId, serviceDate }, orderBy: { tokenNumber: 'desc' }, select: { tokenNumber: true } });
      return tx.queueTicket.create({ data: { organizationId, patientId: dto.patientId, clinicId: dto.clinicId, appointmentId: dto.appointmentId, tokenNumber: (last?.tokenNumber ?? 0)+1, queueType: dto.queueType ?? 'CONSULTATION', serviceDate, notes: dto.notes } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await this.audit.log({ entityType:'queue_ticket', entityId:ticket.id, action:'ISSUE', performedBy, organizationId, purpose:'patient_flow' });
    return ticket;
  }

  list(organizationId: number, clinicId: number, serviceDate?: string) {
    const date = serviceDate ? new Date(serviceDate) : new Date(); date.setHours(0,0,0,0);
    return this.prisma.queueTicket.findMany({ where:{ organizationId, clinicId, serviceDate:date }, include:{ patient:{include:{user:{select:{firstName:true,lastName:true}}}}, appointment:true }, orderBy:{tokenNumber:'asc'} });
  }

  async updateStatus(organizationId:number,id:number,status:'WAITING'|'CALLED'|'IN_PROGRESS'|'COMPLETED'|'SKIPPED',performedBy:number){
    const row=await this.prisma.queueTicket.findFirst({where:{id,organizationId}}); if(!row) throw new NotFoundException('Queue ticket not found');
    const updated=await this.prisma.queueTicket.update({where:{id},data:{status,calledAt:status==='CALLED'?new Date():row.calledAt,startedAt:status==='IN_PROGRESS'?new Date():row.startedAt,completedAt:status==='COMPLETED'?new Date():row.completedAt}});
    await this.audit.log({entityType:'queue_ticket',entityId:id,action:'STATUS_'+status,performedBy,organizationId,purpose:'patient_flow'}); return updated;
  }
}
