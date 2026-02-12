import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { StorageService } from '../application/services/storage.service';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';

@ApiTags('Storage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadFile(@Req() req: any) {
    const data = await req.file();
    if (!data) {
      throw new BadRequestException('No file uploaded');
    }

    const buffer = await data.toBuffer();
    const path = `uploads/${Date.now()}-${data.filename}`;
    const url = await this.storageService.uploadFile(buffer, path, data.mimetype);

    return { url, path };
  }

  @Put('update')
  @ApiOperation({ summary: 'Update an existing file at a path' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['path', 'file'],
      properties: {
        path: {
          type: 'string',
          example: 'uploads/avatar-123.png',
        },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async updateFile(@Req() req: any) {
    const parts = req.parts ? await req.parts() : [];
    let updatePath = '';
    let filePart: any = null;

    for await (const part of parts) {
      if (part.type === 'file') {
        filePart = part;
      } else if (part.fieldname === 'path') {
        updatePath = String(await part.value);
      }
    }

    if (!updatePath) {
      throw new BadRequestException('Path is required');
    }

    if (!filePart) {
      throw new BadRequestException('No file uploaded');
    }

    const buffer = await filePart.toBuffer();
    const url = await this.storageService.updateFile(buffer, updatePath, filePart.mimetype);

    return { url, path: updatePath };
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a file by path' })
  @ApiQuery({ name: 'path', required: true, type: String })
  async deleteFile(@Query('path') path?: string): Promise<void> {
    if (!path) {
      throw new BadRequestException('Path is required');
    }

    await this.storageService.deleteFile(path);
  }

  @Get('url')
  @ApiOperation({ summary: 'Get signed/public URL for a file path' })
  @ApiQuery({ name: 'path', required: true, type: String })
  async getFileUrl(@Query('path') path?: string) {
    if (!path) {
      throw new BadRequestException('Path is required');
    }

    const url = await this.storageService.getUrl(path);
    return { path, url };
  }
}
