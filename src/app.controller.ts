import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('system')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: '获取服务状态' })
  @ApiResponse({
    status: 200,
    description: '服务状态信息',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        data: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'running' },
            environment: { type: 'string', example: 'development' },
            translation: {
              type: 'object',
              properties: {
                provider: { type: 'string', example: 'google' },
                status: { type: 'string', example: 'healthy' },
                supportedLanguages: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['en', 'zh', 'ja'],
                },
              },
            },
            timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
          },
        },
        message: { type: 'string', example: 'Service is running' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
      },
    },
  })
  async getStatus() {
    return this.appService.getStatus();
  }

  @Get('config')
  @ApiOperation({ summary: '获取服务配置' })
  @ApiResponse({
    status: 200,
    description: '服务配置信息',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        data: {
          type: 'object',
          properties: {
            environment: { type: 'string', example: 'development' },
            rssFetchInterval: { type: 'number', example: 300 },
            rssCacheTTL: { type: 'number', example: 3600 },
            translationProvider: { type: 'string', example: 'google' },
            useRealTranslation: { type: 'boolean', example: false },
          },
        },
        message: { type: 'string', example: 'Configuration retrieved successfully' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
      },
    },
  })
  getConfig() {
    return this.appService.getConfig();
  }
}