import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rawBody from 'fastify-raw-body';
import multipart from '@fastify/multipart';
import {
  buildAudienceSwaggerDocument,
  enrichSwaggerDocument,
  withSwaggerInfo,
} from '@common/swagger/swagger-docs';
import { RequestThrottleGuard } from '@common/guards/request-throttle.guard';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(rawBody, {
    field: 'rawBody',
    global: true,
    encoding: 'utf8',
    runFirst: true,
  });

  app.getHttpAdapter().getInstance().addHook('onSend', async (request, reply, payload) => {
    reply.header('x-request-id', request.id);
    return payload;
  });

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
          process.env.FRONTEND_URL1,
          process.env.BACKEND_URL,
          'http://localhost:4000',
          'http://localhost:3300',
          'http://localhost:19006',
          'http://localhost:8081',
          'http://localhost:8082',
          'http://127.0.0.1:19006',
          'http://127.0.0.1:3300',
          'http://127.0.0.1:8081',
          'http://127.0.0.1:8082',
        ].filter(Boolean),
      );

      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      // Allow localhost/127.0.0.1 with Expo ports (19000-19999) or React Native ports (8080-8089)
      if (/^http?:\/\/(localhost|127\.0\.0\.1):(19\d{3}|808\d)$/.test(origin)) {
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

  app.useGlobalGuards(new RequestThrottleGuard());

  // Global prefix (exclude root for health check)
  app.setGlobalPrefix('api', {
    exclude: ['/'],
  });

  // Swagger Configuration
  const { DocumentBuilder, SwaggerModule } = await import('@nestjs/swagger');
  const { writeFileSync } = await import('fs');
  const { join } = await import('path');
  
  const config = new DocumentBuilder()
    .setTitle('Grapper API')
    .setDescription(
      'Comprehensive API reference for Grapper, including client, provider, and admin platform capabilities.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addServer('/', 'Current Host')
    .build();

  const rawDocument = SwaggerModule.createDocument(app, config);
  const fullDocument = enrichSwaggerDocument(rawDocument);
  const clientDocument = withSwaggerInfo(
    buildAudienceSwaggerDocument(fullDocument, 'client'),
    'Grapper API - Client',
    'Client-facing endpoints for end users, including shared user-facing platform flows.',
  );
  const providerDocument = withSwaggerInfo(
    buildAudienceSwaggerDocument(fullDocument, 'provider'),
    'Grapper API - Provider',
    'Provider-facing endpoints for service providers, including shared marketplace and account flows.',
  );
  const adminDocument = withSwaggerInfo(
    buildAudienceSwaggerDocument(fullDocument, 'admin'),
    'Grapper API - Admin',
    'Administrative god-eye documentation with full endpoint visibility, including internal operations.',
  );
  const allDocument = withSwaggerInfo(
    buildAudienceSwaggerDocument(fullDocument, 'all'),
    'Grapper API - All Endpoints',
    'Complete internal API documentation across client, provider, admin, shared, and internal operations.',
  );

  // Write swagger.json file for Postman import (root in dev, dist in prod)
  const isProduction = process.env.NODE_ENV === 'production';
  const outputDir = isProduction && process.cwd().includes('dist')
    ? process.cwd()
    : join(process.cwd(), isProduction ? 'dist' : '');
  const writeSwaggerFile = (fileName: string, content: unknown) => {
    const outputPath = join(outputDir, fileName);
    writeFileSync(outputPath, JSON.stringify(content, null, 2));
    console.log(`Swagger JSON written to: ${outputPath}`);
  };

  writeSwaggerFile('swagger.json', allDocument);
  writeSwaggerFile('swagger-client.json', clientDocument);
  writeSwaggerFile('swagger-provider.json', providerDocument);
  writeSwaggerFile('swagger-admin.json', adminDocument);

  // Setup Swagger UIs with dedicated JSON endpoints
  SwaggerModule.setup('api/docs', app, allDocument as any, {
    jsonDocumentUrl: 'api/docs-json',
  });
  SwaggerModule.setup('api/docs/client', app, clientDocument as any, {
    jsonDocumentUrl: 'api/docs/client-json',
  });
  SwaggerModule.setup('api/docs/provider', app, providerDocument as any, {
    jsonDocumentUrl: 'api/docs/provider-json',
  });
  SwaggerModule.setup('api/docs/admin', app, adminDocument as any, {
    jsonDocumentUrl: 'api/docs/admin-json',
  });

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Application is running on: http://localhost:${port}/api`);
}

bootstrap();
