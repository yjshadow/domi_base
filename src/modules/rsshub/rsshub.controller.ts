import { Controller, Post, Body, UseGuards, Get, Param, Delete, Put, Query, UseInterceptors, UploadedFile, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { RsshubService } from './rsshub.service';
import { CreateRssSourceDto } from './dto/create-rss-source.dto';
import { Public } from '../auth/public.decorator';
import { RssSource } from './entities/rss-source.entity';
import { runInThisContext } from 'vm';

@Controller('rsshub')
export class RsshubController {
    constructor(private readonly rsshubService: RsshubService) {}
    // RSS源管理
      /**
       * 创建新的RSS订阅源
       * @param createRssSourceDto RSS源创建参数
       * @returns 创建的RSS源实体
       */
      @Public()
      @ApiTags('sources')
      @ApiOperation({ summary: '创建RSS源', description: '创建新的RSS订阅源' })
      @ApiBody({ description: 'RSS源创建参数',
         schema: {
          type: 'object',
          required: ['name', 'idx_userid', 'url', 'description', 'active', 'update_interval','custom_selector'],
          properties: {
            name: {
              type: 'string',
              format: 'name',
              description: 'rss订阅源路由',
              example: '/asdfasdf/asdfasdf',
            },
            idx_userid: {
              type: 'int',
              description: '订阅用户',
              example: '3',
            },
            url: {
              type: 'string',},
            description: {
              type: 'string',
              description: 'RSS源描述',
              example: 'RSS源描述',
            },
            active: {
              type: 'boolean',
              description: '是否启用',
              example: 'true',
            },
            update_interval: {
              type: 'number',
              description: '更新间隔，单位为分钟',
              example: '10',
            },
            custom_selector: {
              type: 'string',
              description: '自定义选择器',
              example: 'div.article',
            },
    
          },
        },
       })
      @ApiResponse({ status: 201, description: '创建成功', type: RssSource })
      @Post('sources')
      async createSource(@Body() createRssSourceDto: CreateRssSourceDto): Promise<RssSource> {
        return this.rsshubService.createSource(createRssSourceDto);
      }

      @ApiTags('sources')
      @Public()
      @Get('getsources')
      async getSources(): Promise<any> {
        const source = await this.rsshubService.getSourceById(4);
        return this.rsshubService.fetchArticles(source);
      }

      @Public()
      @Get('getsource/:id')
      async getSource(@Param('id') id: number): Promise<any> {
        const sources =await this.rsshubService.getSourceById(id);
      }
}
