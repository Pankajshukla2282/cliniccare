import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AuthServiceModule } from './auth/auth.module';

async function bootstrap() {
  const app = await NestFactory.create(AuthServiceModule);
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 Auth Service running on http://localhost:${port}`);
}
bootstrap();