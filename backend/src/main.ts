import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyMultipart from '@fastify/multipart';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
    }),
  );

  const configService = app.get(ConfigService);

  // Register Fastify plugins
  await app.register(fastifyCookie, {
    secret: configService.getOrThrow<string>('JWT_SECRET'),
  });

  await app.register(fastifyCors, {
    origin: true,
    credentials: true,
  });

  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'"],
      },
    },
  });

  await app.register(fastifyMultipart, {
    limits: {
      fileSize: configService.get('MAX_FILE_SIZE') || 5 * 1024 * 1024, // 5MB
    },
  });

  // Global prefix
  const apiPrefix = configService.get('API_PREFIX') || 'api';
  app.setGlobalPrefix(apiPrefix);

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Financial Control API')
    .setDescription(
      `
      ## Sistema de Control Financiero Multiorganización
      
      API REST para el control general de dinero (entradas/salidas) aplicable a:
      - Iglesias
      - Comités
      - ONG
      - Condominios
      - Equipos
      - Negocios pequeños
      
      ### Características principales:
      - Multi-organización (multi-tenant)
      - Roles y permisos por organización
      - Manejo seguro de dinero (minor units)
      - Auditoría y trazabilidad
      - Integración con Wompi El Salvador
      
      ### Convención de Dinero:
      Los montos se almacenan en **minor units** (centavos).
      Ejemplo: $10.50 → 1050
      `,
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Organizations', 'Organization management')
    .addTag('Membership', 'User membership and roles')
    .addTag('Accounts', 'Financial accounts management')
    .addTag('Categories', 'Transaction categories')
    .addTag('Payment Methods', 'Payment methods management')
    .addTag('Transactions', 'Financial transactions')
    .addTag('Reports', 'Financial reports')
    .addTag('Exports', 'Data export functionality')
    .addTag('Audit', 'Audit logs')
    .addTag('Subscriptions', 'Subscription plans and Wompi integration')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  // Start server
  const port = configService.get('PORT') || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/docs`);
  console.log(`API endpoint: http://localhost:${port}/${apiPrefix}`);
}

bootstrap();
