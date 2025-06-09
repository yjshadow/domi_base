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
import { RssService } from './rss.service';
import { CreateRssSourceDto } from './dto/create-rss-source.dto';
import { UpdateRssSourceDto } from './dto/update-rss-source.dto';
import { RssSource } from './entities/rss-source.entity';
import { Article } from '../subscription/models/article.entity';
import { FetchProgress } from './entities/fetch-progress.entity';

@Controller('rss')
export class RssController {
  constructor(private readonly rssService: RssService) {}

  // RSS源管理
  @Post('sources')
  async createSource(@Body() createRssSourceDto: CreateRssSourceDto): Promise<RssSource> {
    return this.rssService.createSource(createRssSourceDto);
  }

  @Put('sources/:id')
  async updateSource(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRssSourceDto: UpdateRssSourceDto,
  ): Promise<RssSource> {
    return this.rssService.updateSource(id, updateRssSourceDto);
  }

  @Delete('sources/:id')
  async deleteSource(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.rssService.deleteSource(id);
  }

  @Get('sources/:id')
  async getSource(@Param('id', ParseIntPipe) id: number): Promise<RssSource> {
    return this.rssService.getSource(id);
  }

  @Get('sources')
  async getAllSources(): Promise<RssSource[]> {
    return this.rssService.getAllSources();
  }

  // 文章管理
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

  @Put('articles/:id/read')
  async markArticleAsRead(
    @Param('id', ParseIntPipe) id: number,
    @Body('isRead') isRead: boolean,
  ): Promise<Article> {
    return this.rssService.markArticleAsRead(id, isRead);
  }

  @Put('articles/:id/favorite')
  async toggleArticleFavorite(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Article> {
    return this.rssService.toggleArticleFavorite(id);
  }

  // 进度管理
  @Get('sources/:id/progress')
  async getFetchProgress(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<FetchProgress> {
    return this.rssService.getFetchProgress(id);
  }

  @Post('sources/:id/reset')
  async resetAndRefetch(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.rssService.resetAndRefetch(id);
  }

  // 手动触发更新
  @Post('sources/:id/fetch')
  async manualFetch(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    const source = await this.rssService.getSource(id);
    return this.rssService.fetchArticles(source, true);
  }

  // 更新所有活跃源
  @Post('sources/update-all')
  async updateAllActiveSources(): Promise<void> {
    return this.rssService.updateAllActiveSources();
  }
}