import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { WaitlistPromotionService } from '../contexts/waitlist/application/services/waitlist-promotion.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const service = app.get(WaitlistPromotionService);
    const result = await service.promoteAll();
    console.log(JSON.stringify(result, null, 2));
  } finally {
    try {
      await app.close();
    } catch {
      // Ignore shutdown hook issues in one-off promotion runs.
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
