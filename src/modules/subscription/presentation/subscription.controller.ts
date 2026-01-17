import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PlanService } from '../application/services/plan.service';
import { SubscriptionService } from '../application/services/subscription.service';
import {
  CreatePlanDto,
  UpdatePlanDto,
  PlanResponseDto,
  CreateSubscriptionDto,
  CancelSubscriptionDto,
  SubscriptionResponseDto,
} from '../application/dto/subscription.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '../../identity/domain/entities/user.entity';
import { UserRole } from '../../identity/domain/value-objects/user-role.vo';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Subscription Plans')
@Controller('plans')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Get()
  @ApiOperation({ summary: 'Get all available subscription plans' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [PlanResponseDto] })
  async getPlans(
    @Query('includeInactive') includeInactive?: boolean,
  ): Promise<PlanResponseDto[]> {
    return this.planService.findAll(includeInactive === true);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get plan details by ID' })
  @ApiResponse({ status: 200, type: PlanResponseDto })
  async getPlan(@Param('id') id: string): Promise<PlanResponseDto> {
    return this.planService.findById(id);
  }

  @ApiBearerAuth()
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new subscription plan (Admin only)' })
  @ApiResponse({ status: 201, type: PlanResponseDto })
  async createPlan(@Body() dto: CreatePlanDto): Promise<PlanResponseDto> {
    return this.planService.create(dto);
  }

  @ApiBearerAuth()
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update an existing subscription plan (Admin only)' })
  @ApiResponse({ status: 200, type: PlanResponseDto })
  async updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto,
  ): Promise<PlanResponseDto> {
    return this.planService.update(id, dto);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete/Deactivate a subscription plan (Admin only)' })
  @ApiResponse({ status: 204 })
  async deletePlan(@Param('id') id: string): Promise<void> {
    return this.planService.delete(id);
  }
}

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user active subscription' })
  @ApiResponse({ status: 200, type: SubscriptionResponseDto })
  async getMySubscription(
    @CurrentUser() user: User,
  ): Promise<SubscriptionResponseDto | null> {
    return this.subscriptionService.findByUser(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subscription details by ID' })
  @ApiResponse({ status: 200, type: SubscriptionResponseDto })
  async getSubscription(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionService.findById(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Subscribe to a plan' })
  @ApiResponse({ status: 201, type: SubscriptionResponseDto })
  async createSubscription(
    @CurrentUser() user: User,
    @Body() dto: CreateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionService.create(user.id, dto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an active subscription' })
  @ApiResponse({ status: 200, type: SubscriptionResponseDto })
  async cancelSubscription(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: CancelSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionService.cancel(id, user.id, dto);
  }
}
