import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrderService } from '../application/services/order.service';
import {
  CreateOrderDto,
  UpdateOrderDto,
  CancelOrderDto,
  OrderResponseDto,
} from '../application/dto/order.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthUser } from '@shared/types/auth-user.type';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Permissions } from '@common/decorators/permissions.decorator';
import { PERMISSIONS } from '@common/authz/permissions.enum';

@ApiTags('Service Orders')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get('my-orders')
  @ApiOperation({ summary: 'Get orders placed by current customer' })
  @Permissions(PERMISSIONS.MARKETPLACE_BOOKING_CUSTOMER_READ_OWN)
  @ApiResponse({ status: 200, type: [OrderResponseDto] })
  async getMyOrders(@CurrentUser() user: AuthUser): Promise<OrderResponseDto[]> {
    return this.orderService.getCustomerOrders(user.id);
  }

  @Get('provider-orders')
  @ApiOperation({ summary: 'Get orders received by current provider' })
  @Permissions(PERMISSIONS.MARKETPLACE_BOOKING_PROVIDER_READ_OWN)
  @ApiResponse({ status: 200, type: [OrderResponseDto] })
  async getProviderOrders(@CurrentUser() user: AuthUser): Promise<OrderResponseDto[]> {
    return this.orderService.getProviderOrders(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details by ID' })
  @Permissions(PERMISSIONS.MARKETPLACE_BOOKING_PARTICIPANT_READ)
  @ApiResponse({ status: 200, type: OrderResponseDto })
  async getOrder(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<OrderResponseDto> {
    return this.orderService.findById(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @Permissions(PERMISSIONS.MARKETPLACE_BOOKING_CUSTOMER_CREATE)
  @ApiResponse({ status: 201, type: OrderResponseDto })
  async createOrder(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    return this.orderService.create(user.id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update order details' })
  @Permissions(PERMISSIONS.MARKETPLACE_BOOKING_PARTICIPANT_UPDATE)
  @ApiResponse({ status: 200, type: OrderResponseDto })
  async updateOrder(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
  ): Promise<OrderResponseDto> {
    return this.orderService.update(id, user.id, dto);
  }

  @Post(':id/start-work')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start work on the order (Provider only)' })
  @Permissions(PERMISSIONS.MARKETPLACE_BOOKING_PROVIDER_START)
  @ApiResponse({ status: 200, type: OrderResponseDto })
  async startWork(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<OrderResponseDto> {
    return this.orderService.startWork(id, user.id);
  }

  @Post(':id/deliver')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deliver the order (Provider only)' })
  @Permissions(PERMISSIONS.MARKETPLACE_BOOKING_PROVIDER_DELIVER)
  @ApiResponse({ status: 200, type: OrderResponseDto })
  async deliver(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<OrderResponseDto> {
    return this.orderService.deliver(id, user.id);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete the order (Customer only)' })
  @Permissions(PERMISSIONS.MARKETPLACE_BOOKING_CUSTOMER_COMPLETE)
  @ApiResponse({ status: 200, type: OrderResponseDto })
  async complete(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<OrderResponseDto> {
    return this.orderService.complete(id, user.id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel the order' })
  @Permissions(PERMISSIONS.MARKETPLACE_BOOKING_PARTICIPANT_CANCEL)
  @ApiResponse({ status: 200, type: OrderResponseDto })
  async cancel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ): Promise<OrderResponseDto> {
    return this.orderService.cancel(id, user.id, dto);
  }
}
