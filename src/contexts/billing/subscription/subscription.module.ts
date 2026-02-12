import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionPlan } from './domain/entities/subscription-plan.entity';
import { Subscription } from './domain/entities/subscription.entity';
import { PlanService } from './application/services/plan.service';
import { SubscriptionService } from './application/services/subscription.service';
import { PlanController, SubscriptionController } from './presentation/subscription.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SubscriptionPlan, Subscription])],
  controllers: [PlanController, SubscriptionController],
  providers: [PlanService, SubscriptionService],
  exports: [PlanService, SubscriptionService],
})
export class SubscriptionModule {}
