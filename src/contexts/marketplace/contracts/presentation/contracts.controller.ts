
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ContractService } from '../application/services/contract.service';
import { CreateContractDto, UpdateContractDto, CreateMilestoneDto, UpdateMilestoneDto } from '../application/dto/contract.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthUser } from '@shared/types/auth-user.type';

@ApiTags('Contracts')
@ApiBearerAuth()
@Controller('contracts')
@UseGuards(JwtAuthGuard)
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new contract' })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateContractDto) {
    return this.contractService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all contracts for current user' })
  async findAll(@CurrentUser() user: AuthUser) {
    return this.contractService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contract by ID' })
  async findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.contractService.findOne(id, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update contract' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateContractDto,
  ) {
    return this.contractService.update(id, user.id, dto);
  }

  @Post(':id/milestones')
  @ApiOperation({ summary: 'Add milestone to contract' })
  async addMilestone(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.contractService.addMilestone(id, user.id, dto);
  }

  @Put(':id/milestones/:milestoneId')
  @ApiOperation({ summary: 'Update milestone status' })
  async updateMilestone(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('milestoneId') milestoneId: string,
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.contractService.updateMilestone(id, milestoneId, user.id, dto);
  }

  @Post(':id/files')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload contract file' })
  async uploadFile(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @UploadedFile() file: any, // Express.Multer.File
  ) {
    // In a real app, upload to S3/Cloudinary here. 
    // For now, we mock the URL or use a local path.
    // If StorageService was injected, we'd use it.
    // Assuming local simulation:
    const fileData = {
      name: file.originalname,
      url: `https://api.gripper.com/uploads/${file.filename}`, // Mock URL
      type: file.mimetype,
      size: file.size,
    };
    return this.contractService.addFile(id, user.id, fileData);
  }

  @Get(':id/activity')
  @ApiOperation({ summary: 'Get contract activity' })
  async getActivity(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.contractService.getActivity(id, user.id);
  }
}
