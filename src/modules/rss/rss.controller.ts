import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiResponse } from '@nestjs/swagger';
import { RssService } from './rss.service';
import { CreateRssSourceDto } from '../rsshub/dto/create-rss-source.dto';
import { UpdateRssSourceDto } from '../rsshub/dto/update-rss-source.dto';
import { RssSource } from './entities/rss-source.entity';
import { Article } from '../subscription/models/article.entity';
import { FetchProgress } from './entities/fetch-progress.entity';
import {Public} from '../auth/public.decorator';

@ApiTags('RSS订阅')
@Controller('rss')
export class RssController {
  constructor(private readonly rssService: RssService) {}

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
    return this.rssService.createSource(createRssSourceDto);
  }

  /**
   * 更新RSS源的配置信息
   * @param id RSS源ID
   * @param updateRssSourceDto 更新参数
   * @returns 更新后的RSS源实体
   */
  @ApiOperation({ summary: '更新RSS源', description: '更新现有RSS源的配置信息' })
  @ApiParam({ name: 'id', description: 'RSS源ID' })
  @ApiBody({ type: UpdateRssSourceDto, description: 'RSS源更新参数' })
  @ApiResponse({ status: 200, description: '更新成功', type: RssSource })
  @Put('sources/:id')
  async updateSource(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRssSourceDto: UpdateRssSourceDto,
  ): Promise<RssSource> {
    return this.rssService.updateSource(id, updateRssSourceDto);
  }

  /**
   * 删除指定的RSS源
   * @param id RSS源ID
   */
  @ApiOperation({ summary: '删除RSS源', description: '删除指定的RSS订阅源' })
  @ApiParam({ name: 'id', description: 'RSS源ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @Delete('sources/:id')
  async deleteSource(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.rssService.deleteSource(id);
  }

  /**
   * 获取指定RSS源的详细信息
   * @param id RSS源ID
   * @returns RSS源实体
   */
  @ApiOperation({ summary: '获取RSS源详情', description: '获取指定RSS源的详细信息' })
  @ApiParam({ name: 'id', description: 'RSS源ID' })
  @ApiResponse({ status: 200, description: '获取成功', type: RssSource })
  @Get('sources/:id')
  async getSource(@Param('id', ParseIntPipe) id: number): Promise<RssSource> {
    return this.rssService.getSource(id);
  }

  /**
   * 获取所有RSS源的列表
   * @returns RSS源实体数组
   */
  @ApiOperation({ summary: '获取所有RSS源', description: '获取所有RSS订阅源的列表' })
  @ApiResponse({ status: 200, description: '获取成功', type: [RssSource] })
  @Get('sources')
  async getAllSources(): Promise<RssSource[]> {
    return this.rssService.getAllSources();
  }

  // 文章管理
  /**
   * 获取文章列表，支持分页和多种过滤条件
   * @param sourceId 可选的RSS源ID
   * @param page 页码，默认为1
   * @param limit 每页数量，默认为20
   * @param isRead 是否已读
   * @param isFavorite 是否收藏
   * @returns [文章列表, 总数]
   */
  @ApiOperation({ summary: '获取文章列表', description: '获取文章列表，支持分页和多种过滤条件' })
  @ApiQuery({ name: 'sourceId', required: false, description: 'RSS源ID' })
  @ApiQuery({ name: 'page', required: false, description: '页码'})
  @ApiQuery({ name: 'limit', required: false, description: '每页数量' })
  @ApiQuery({ name: 'isRead', required: false, description: '是否已读' })
  @ApiQuery({ name: 'isFavorite', required: false, description: '是否收藏' })
  @ApiResponse({ status: 200, description: '获取成功', type: [Article] })
  @Get('articles')
  async getArticles(
    @Query('sourceId') sourceId?: number,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('isRead') isRead?: boolean,
    @Query('isFavorite') isFavorite?: boolean,
  ): Promise<[Article[], number]> {
    return this.rssService.getArticles(sourceId, page, limit, isRead, isFavorite);
  }

  /**
   * 标记文章的阅读状态
   * @param id 文章ID
   * @param isRead 是否标记为已读
   * @returns 更新后的文章实体
   */
  @ApiOperation({ summary: '标记文章阅读状态', description: '将文章标记为已读或未读' })
  @ApiParam({ name: 'id', description: '文章ID' })
  @ApiBody({ schema: { properties: { isRead: { type: 'boolean' } } } })
  @ApiResponse({ status: 200, description: '更新成功', type: Article })
  @Put('articles/:id/read')
  async markArticleAsRead(
    @Param('id', ParseIntPipe) id: number,
    @Body('isRead') isRead: boolean,
  ): Promise<Article> {
    return this.rssService.markArticleAsRead(id, isRead);
  }

  /**
   * 切换文章的收藏状态
   * @param id 文章ID
   * @returns 更新后的文章实体
   */
  @ApiOperation({ summary: '切换文章收藏状态', description: '切换文章的收藏/取消收藏状态' })
  @ApiParam({ name: 'id', description: '文章ID' })
  @ApiResponse({ status: 200, description: '更新成功', type: Article })
  @Put('articles/:id/favorite')
  async toggleArticleFavorite(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Article> {
    return this.rssService.toggleArticleFavorite(id);
  }

  // 进度管理
  /**
   * 获取RSS源的获取进度信息
   * @param id RSS源ID
   * @returns 获取进度记录
   */
  @ApiOperation({ summary: '获取RSS源进度', description: '获取指定RSS源的文章获取进度信息' })
  @ApiParam({ name: 'id', description: 'RSS源ID' })
  @ApiResponse({ status: 200, description: '获取成功', type: FetchProgress })
  @Get('sources/:id/progress')
  async getFetchProgress(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<FetchProgress> {
    return this.rssService.getFetchProgress(id);
  }

  /**
   * 重置RSS源的获取进度并强制刷新
   * @param id RSS源ID
   */
  @ApiOperation({ summary: '重置并刷新RSS源', description: '重置RSS源的获取进度并强制刷新内容' })
  @ApiParam({ name: 'id', description: 'RSS源ID' })
  @ApiResponse({ status: 200, description: '重置并刷新成功' })
  @Post('sources/:id/reset')
  async resetAndRefetch(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.rssService.resetAndRefetch(id);
  }

  // 手动触发更新
  /**
   * 手动获取指定RSS源的文章
   * @param id RSS源ID
   */
  @ApiOperation({ summary: '手动获取文章', description: '手动触发指定RSS源的文章获取' })
  @ApiParam({ name: 'id', description: 'RSS源ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @Post('sources/:id/fetch')
  async manualFetch(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    const source = await this.rssService.getSource(id);
    return this.rssService.fetchArticles(source, true);
  }

  // 更新所有活跃源
  /**
   * 更新所有活跃的RSS源
   */
  @ApiOperation({ summary: '更新所有活跃源', description: '触发更新所有活跃状态的RSS源' })
  @ApiResponse({ status: 200, description: '更新触发成功' })
  @Post('sources/update-all')
  async updateAllActiveSources(): Promise<void> {
    return this.rssService.updateAllActiveSources();
  }

  /**
   * 立即触发所有RSS源的更新，不考虑更新间隔
   */
  @Public()
  @ApiOperation({ summary: '立即更新所有源', description: '立即触发所有活跃RSS源的更新，不考虑更新间隔' })
  @ApiResponse({ status: 200, description: '更新触发成功' })
  @Post('sources/trigger-update')
  async triggerUpdate(): Promise<void> {
    return this.rssService.triggerUpdate();
  }
}