import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { WaitlistRegisterDto, WaitlistRegisterResponseDto } from '../application/dto/waitlist.dto';
import { WaitlistService } from '../application/services/waitlist.service';

@ApiTags('Waitlist')
@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a user on the waitlist' })
  @ApiResponse({ status: 201, type: WaitlistRegisterResponseDto })
  async register(@Body() dto: WaitlistRegisterDto): Promise<WaitlistRegisterResponseDto> {
    return this.waitlistService.register(dto);
  }
}
