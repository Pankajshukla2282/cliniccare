import 'reflect-metadata';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

const isProduction = process.env.NODE_ENV === 'production';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'healthz', method: RequestMethod.GET }],
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true }),
  );
  // Behind the ingress/load balancer so rate limiting keys on the client IP.
  const trustProxy = Number(process.env.TRUST_PROXY ?? 0);
  if (trustProxy > 0) {
    const http = app.getHttpAdapter().getInstance() as {
      set(key: string, value: number): void;
    };
    http.set('trust proxy', trustProxy);
  }
  app.enableCors({ origin: (process.env.CORS_ORIGIN ?? '*').split(',') });

  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('ClinicCare Platform API')
      .setDescription('Multi-doctor clinic platform: clinical, scheduling, commerce')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(Number(process.env.PORT ?? 3000));
  app.enableShutdownHooks();
}
// eslint-disable-next-line no-console
bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
