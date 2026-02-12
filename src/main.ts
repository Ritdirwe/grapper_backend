import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  // Register Fastify CORS plugin
  await app.register(cors, {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin || origin === 'null') {
        return callback(null, true);
      }

      const allowedOrigins = new Set(
        [
          process.env.FRONTEND_URL,
          'http://localhost:4000',
          'http://localhost:19006',
          'http://localhost:8081',
          'http://localhost:8082',
          'http://127.0.0.1:19006',
          'http://127.0.0.1:8081',
          'http://127.0.0.1:8082',
        ].filter(Boolean),
      );

      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      // Allow localhost/127.0.0.1 with Expo ports (19000-19999) or React Native ports (8080-8089)
      if (/^https?:\/\/(localhost|127\.0\.0\.1):(19\d{3}|808\d)$/.test(origin)) {
        return callback(null, true);
      }

      // Allow any local IP address with any port (for mobile development)
      if (/^https?:\/\/\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-createxyz-host'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Register Fastify Multipart plugin for file uploads
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
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

  // Global prefix (exclude root for health check)
  app.setGlobalPrefix('api', {
    exclude: ['/'],
  });

  // Swagger Configuration
  const { DocumentBuilder, SwaggerModule } = await import('@nestjs/swagger');
  const { writeFileSync } = await import('fs');
  const { join } = await import('path');
  
  const config = new DocumentBuilder()
    .setTitle('Gripper API')
    .setDescription('The comprehensive API for the Gripper platform backend.')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer(`http://localhost:${process.env.PORT || 3000}`, 'Local Development')
    .addServer(process.env.API_URL || 'https://api.gripper.com', 'Production')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  
  // Write swagger.json file for Postman import (root in dev, dist in prod)
  const isProduction = process.env.NODE_ENV === 'production';
  const outputDir = isProduction && process.cwd().includes('dist') 
    ? process.cwd() 
    : join(process.cwd(), isProduction ? 'dist' : '');
  const outputPath = join(outputDir, 'swagger.json');
  writeFileSync(outputPath, JSON.stringify(document, null, 2));
  console.log(`📄 Swagger JSON written to: ${outputPath}`);
  
  // Setup Swagger UI with JSON endpoint
  // This automatically creates /api/docs-json endpoint
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
  });

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Application is running on: http://localhost:${port}/api`);
}

bootstrap();
