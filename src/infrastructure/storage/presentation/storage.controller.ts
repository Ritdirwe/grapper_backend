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
    let buffer: Buffer | null = null;
    let filename = `upload-${Date.now()}.bin`;
    let mimetype = 'application/octet-stream';

    // 1. Try to extract from attached body fields (fastify multipart option: attachFieldsToBody)
    if (req.body) {
      const bodyFile = Array.isArray(req.body.file) ? req.body.file[0] : req.body.file;
      if (bodyFile?.toBuffer) {
        buffer = await bodyFile.toBuffer();
        filename = bodyFile.filename || filename;
        mimetype = bodyFile.mimetype || mimetype;
      } else if (Buffer.isBuffer(bodyFile)) {
        buffer = bodyFile;
      }
    }

    try {
      // 2. Try to extract from req.file()
      if (!buffer && typeof req.file === 'function') {
        const data = await req.file();
        if (data) {
          buffer = await data.toBuffer();
          filename = data.filename || filename;
          mimetype = data.mimetype || mimetype;
        }
      }

      // 3. Try to extract from req.parts()
      if (!buffer && typeof req.parts === 'function') {
        const parts = req.parts();
        for await (const part of parts) {
          if (part.type === 'file' && !buffer) {
            buffer = await part.toBuffer();
            filename = part.filename || filename;
            mimetype = part.mimetype || mimetype;
          }
        }
      }
    } catch (err) {
      // Ignore errors if the stream was already consumed
    }

    if (!buffer) {
      throw new BadRequestException('No file uploaded');
    }

    const path = `uploads/${Date.now()}-${filename}`;
    const url = await this.storageService.uploadFile(buffer, path, mimetype);
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
    let updatePath = req.body?.path;
    let buffer: Buffer | null = null;
    let mimetype = 'application/octet-stream';

    // 1. Try body fields (fastify attachFieldsToBody)
    if (req.body) {
      const bodyFile = Array.isArray(req.body.file) ? req.body.file[0] : req.body.file;
      if (bodyFile?.toBuffer) {
        buffer = await bodyFile.toBuffer();
        mimetype = bodyFile.mimetype || mimetype;
      } else if (Buffer.isBuffer(bodyFile)) {
        buffer = bodyFile;
      }
    }

    // 2. Try falling back to parts (handles standard multipart streams without global attachFieldsToBody)
    try {
      if ((!buffer || !updatePath) && typeof req.parts === 'function') {
        const parts = req.parts();
        for await (const part of parts) {
          if (part.type === 'file' && part.fieldname === 'file') {
            buffer = await part.toBuffer();
            mimetype = part.mimetype || mimetype;
          } else if (part.type === 'field' && part.fieldname === 'path') {
            updatePath = String(part.value);
          }
        }
      }
    } catch (err) {
      // Ignore if stream consumed
    }

    if (!updatePath) {
      throw new BadRequestException('Path is required');
    }

    if (!buffer) {
      throw new BadRequestException('No file uploaded');
    }

    const url = await this.storageService.updateFile(buffer, updatePath, mimetype);

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
