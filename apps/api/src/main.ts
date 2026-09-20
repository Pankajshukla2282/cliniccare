import 'reflect-metadata';
import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { apiConfig } from './config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useBodyParser('json', { limit: apiConfig.bodyLimit });
  app.useBodyParser('urlencoded', { limit: apiConfig.bodyLimit, extended: true });
  app.use(helmet({ contentSecurityPolicy: apiConfig.isProduction ? undefined : false }));
  app.enableCors({ origin: apiConfig.webOrigin, credentials: apiConfig.corsAllowCredentials, methods: ['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization','X-Request-Id','Idempotency-Key','X-Purpose-Of-Use'] });
  app.setGlobalPrefix(apiConfig.basePath.replace(/^\//, ''));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true }, disableErrorMessages: apiConfig.isProduction }));

  if (apiConfig.enableSwagger) {
    const config = new DocumentBuilder().setTitle('ClinicCare API').setDescription('ClinicCare REST API').setVersion(apiConfig.apiVersion).addBearerAuth().build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(apiConfig.swaggerPath, app, document, { swaggerOptions: { persistAuthorization: true } });
  }

  await app.listen(apiConfig.port, apiConfig.host);
}
bootstrap();
