import { PrismaClient } from '@prisma/client';

export class AuthPrismaService extends PrismaClient {
  constructor() {
    super({
      schema: './prisma/schema.prisma',
      // The datasource URL will be from the main prisma config
    });
  }
}