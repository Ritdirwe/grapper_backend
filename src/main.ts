import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

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

  // CORS configuration
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4000',
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

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
  
  // Write swagger.json file for Postman import
  const outputPath = join(process.cwd(), 'swagger.json');
  writeFileSync(outputPath, JSON.stringify(document, null, 2));
  console.log(`📄 Swagger JSON written to: ${outputPath}`);
  
  // Setup Swagger UI with JSON endpoint
  // This automatically creates /api/docs-json endpoint
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Application is running on: http://localhost:${port}/api`);
}

bootstrap();
