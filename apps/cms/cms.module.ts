import { Module } from '@nestjs/common';
import { PrismaModule } from '../api/prisma/prisma.module';
import { PagesModule } from './pages/pages.module';

@Module({
  imports: [PrismaModule, PagesModule],
})
export class CmsModule {}