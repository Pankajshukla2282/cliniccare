import { Module } from '@nestjs/common';
import { PrismaModule } from '../api/prisma/prisma.module';
import { CatalogModule } from './catalog/catalog.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [PrismaModule, CatalogModule, ProductsModule],
})
export class ProductModule {}