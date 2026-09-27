import { Module } from '@nestjs/common';
import { PrismaModule } from '../api/prisma/prisma.module';
import { TicketsModule } from './tickets/tickets.module';

@Module({
  imports: [PrismaModule, TicketsModule],
})
export class QueueModule {}