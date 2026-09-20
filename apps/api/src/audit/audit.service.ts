import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  entityType: string;
  entityId: number;
  action: string;
  performedBy?: number;
  organizationId?: number;
  changes?: unknown;
  purpose?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry) {
    let organizationId = entry.organizationId;
    if (organizationId === undefined && entry.performedBy !== undefined) {
      const actor = await this.prisma.user.findUnique({
        where: { id: entry.performedBy },
        select: { organizationId: true },
      });
      organizationId = actor?.organizationId ?? undefined;
    }
    return this.prisma.auditLog.create({
      data: {
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        performedBy: entry.performedBy,
        organizationId: organizationId ?? null,
        changes: entry.changes === undefined ? undefined : (entry.changes as object),
        purpose: entry.purpose,
      },
    });
  }

  query(organizationId: number, filters: {
    entityType?: string;
    entityId?: number;
    action?: string;
    performedBy?: number;
    purpose?: string;
    skip?: number;
    take?: number;
  }) {
    return this.prisma.auditLog.findMany({
      where: {
        organizationId,
        ...(filters.entityType ? { entityType: filters.entityType } : {}),
        ...(filters.entityId ? { entityId: filters.entityId } : {}),
        ...(filters.action ? { action: filters.action } : {}),
        ...(filters.performedBy ? { performedBy: filters.performedBy } : {}),
        ...(filters.purpose ? { purpose: filters.purpose } : {}),
      },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { performedAt: 'desc' },
      skip: filters.skip ?? 0,
      take: Math.min(filters.take ?? 50, 200),
    });
  }

  entityHistory(organizationId: number, entityType: string, entityId: number) {
    return this.prisma.auditLog.findMany({
      where: { organizationId, entityType, entityId },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { performedAt: 'desc' },
    });
  }
}
