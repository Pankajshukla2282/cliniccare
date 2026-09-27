import { Module } from '@nestjs/common';
import { PrismaService } from '../api/prisma/prisma.service';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';

@Module({
  controllers: [PagesController],
  providers: [PagesService],
  exports: [PagesService],
})
export class PagesModule {}