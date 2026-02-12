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
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthUser } from '@shared/types/auth-user.type';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Service Orders')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get('my-orders')
  @ApiOperation({ summary: 'Get orders placed by current customer' })
  @ApiResponse({ status: 200, type: [OrderResponseDto] })
  async getMyOrders(@CurrentUser() user: AuthUser): Promise<OrderResponseDto[]> {
    return this.orderService.getCustomerOrders(user.id);
  }

  @Get('provider-orders')
  @ApiOperation({ summary: 'Get orders received by current provider' })
  @ApiResponse({ status: 200, type: [OrderResponseDto] })
  async getProviderOrders(@CurrentUser() user: AuthUser): Promise<OrderResponseDto[]> {
    return this.orderService.getProviderOrders(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details by ID' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  async getOrder(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<OrderResponseDto> {
    return this.orderService.findById(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, type: OrderResponseDto })
  async createOrder(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    return this.orderService.create(user.id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update order details' })
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
  @ApiResponse({ status: 200, type: OrderResponseDto })
  async cancel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ): Promise<OrderResponseDto> {
    return this.orderService.cancel(id, user.id, dto);
  }
}
