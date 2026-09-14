import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SearchResult {
  patients: unknown[];
  doctors: unknown[];
  appointments: unknown[];
  services: unknown[];
  products: unknown[];
  orders: unknown[];
  articles: unknown[];
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(organizationId: number, q: string, scope = 'all', skip = 0, take = 10): Promise<Partial<SearchResult>> {
    const query = q.trim();
    if (query.length < 2) return {};
    const limit = Math.min(take, 50);
    const out: Partial<SearchResult> = {};
    const tasks: Promise<void>[] = [];

    if (scope === 'all' || scope === 'patients') {
      tasks.push(
        this.prisma.patient
          .findMany({
            where: {
              organizationId,
              OR: [
                { patientNumber: { contains: query, mode: 'insensitive' } },
                { user: { email: { contains: query, mode: 'insensitive' } } },
                { user: { firstName: { contains: query, mode: 'insensitive' } } },
                { user: { lastName: { contains: query, mode: 'insensitive' } } },
              ],
            },
            include: { user: { select: { firstName: true, lastName: true, email: true } } },
            skip,
            take: limit,
          })
          .then((r) => {
            out.patients = r;
          }),
      );
    }
    if (scope === 'all' || scope === 'doctors') {
      tasks.push(
        this.prisma.doctor
          .findMany({
            where: {
              clinic: { organizationId },
              OR: [
                { qualification: { contains: query, mode: 'insensitive' } },
                { registrationNumber: { contains: query, mode: 'insensitive' } },
                { user: { firstName: { contains: query, mode: 'insensitive' } } },
                { user: { lastName: { contains: query, mode: 'insensitive' } } },
                { specialties: { some: { specialty: { name: { contains: query, mode: 'insensitive' } } } } },
              ],
            },
            include: { user: { select: { firstName: true, lastName: true } } },
            skip,
            take: limit,
          })
          .then((r) => {
            out.doctors = r;
          }),
      );
    }
    if (scope === 'all' || scope === 'services') {
      tasks.push(
        this.prisma.service
          .findMany({
            where: {
              organizationId,
              name: { contains: query, mode: 'insensitive' },
            },
            skip,
            take: limit,
          })
          .then((r) => {
            out.services = r;
          }),
      );
    }
    if (scope === 'all' || scope === 'products') {
      tasks.push(
        this.prisma.product
          .findMany({
            where: {
              organizationId,
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { brand: { contains: query, mode: 'insensitive' } },
                { sku: { contains: query, mode: 'insensitive' } },
              ],
            },
            skip,
            take: limit,
          })
          .then((r) => {
            out.products = r;
          }),
      );
    }
    if (scope === 'all' || scope === 'orders') {
      tasks.push(
        this.prisma.order
          .findMany({
            where: { patient: { organizationId }, orderNumber: { contains: query, mode: 'insensitive' } },
            skip,
            take: limit,
          })
          .then((r) => {
            out.orders = r;
          }),
      );
    }
    if (scope === 'all' || scope === 'appointments') {
      tasks.push(
        this.prisma.appointment
          .findMany({
            where: {
              patient: { organizationId },
              OR: [
                { notes: { contains: query, mode: 'insensitive' } },
                { patient: { patientNumber: { contains: query, mode: 'insensitive' } } },
              ],
            },
            include: {
              patient: { include: { user: { select: { firstName: true, lastName: true } } } },
              doctor: { include: { user: { select: { firstName: true, lastName: true } } } },
            },
            skip,
            take: limit,
          })
          .then((r) => {
            out.appointments = r;
          }),
      );
    }
    if (scope === 'all' || scope === 'articles') {
      tasks.push(
        this.prisma.cmsPage
          .findMany({
            where: {
              organizationId,
              status: 'PUBLISHED',
              OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { slug: { contains: query, mode: 'insensitive' } },
              ],
            },
            skip,
            take: limit,
          })
          .then((r) => {
            out.articles = r;
          }),
      );
    }
    await Promise.all(tasks);
    return out;
  }
}
