import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Logger,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ArticleTranslatorService } from './article-translator.service';
import { TranslationRequestDto } from './dto/translation-request.dto';
import { TranslationResultDto } from './dto/translation-result.dto';
import { TranslationStatsDto } from './dto/translation-stats.dto';

@ApiTags('article-translator')
@Controller('article-translator')
export class ArticleTranslatorController {
  private readonly logger = new Logger(ArticleTranslatorController.name);

  constructor(private readonly articleTranslatorService: ArticleTranslatorService) {}

  @Post(':id/translate')
  @ApiOperation({ summary: '翻译指定文章' })
  @ApiParam({ name: 'id', description: '文章ID' })
  @ApiResponse({ status: 200, description: '翻译成功', type: TranslationResultDto })
  async translateArticle(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ transform: true })) translationRequest: TranslationRequestDto,
  ): Promise<TranslationResultDto> {
    try {
      return await this.articleTranslatorService.translateArticle(id, translationRequest);
    } catch (error) {
      this.logger.error(`Translation failed for article ${id}: ${error.message}`);
      throw new BadRequestException(`Translation failed: ${error.message}`);
    }
  }

  @Post('batch-translate')
  @ApiOperation({ summary: '批量翻译多个文章' })
  @ApiResponse({ status: 200, description: '批量翻译成功', type: [TranslationResultDto] })
  async batchTranslateArticles(
    @Body('articleIds', new ValidationPipe({ transform: true })) articleIds: number[],
    @Body('translationRequest', new ValidationPipe({ transform: true })) translationRequest: TranslationRequestDto,
  ): Promise<TranslationResultDto[]> {
    if (!Array.isArray(articleIds) || articleIds.length === 0) {
      throw new BadRequestException('Invalid or empty articleIds array');
    }
    return await this.articleTranslatorService.batchTranslateArticles(articleIds, translationRequest);
  }

  @Get(':id/translation')
  @ApiOperation({ summary: '获取文章翻译' })
  @ApiParam({ name: 'id', description: '文章ID' })
  @ApiQuery({ name: 'language', required: false, description: '目标语言代码' })
  @ApiResponse({ status: 200, description: '获取翻译成功', type: TranslationResultDto })
  async getTranslation(
    @Param('id', ParseIntPipe) id: number,
    @Query('language') language?: string,
  ): Promise<TranslationResultDto> {
    return await this.articleTranslatorService.getTranslation(id, language);
  }

  @Get(':id/quality')
  @ApiOperation({ summary: '评估翻译质量' })
  @ApiParam({ name: 'id', description: '文章ID' })
  @ApiQuery({ name: 'language', required: true, description: '目标语言代码' })
  @ApiResponse({ status: 200, description: '质量评估成功', type: Number })
  async evaluateTranslationQuality(
    @Param('id', ParseIntPipe) id: number,
    @Query('language') language: string,
  ): Promise<number> {
    if (!language) {
      throw new BadRequestException('Language parameter is required');
    }
    return await this.articleTranslatorService.evaluateTranslationQuality(id, language);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: '获取翻译统计信息' })
  @ApiParam({ name: 'id', description: '文章ID' })
  @ApiResponse({ status: 200, description: '获取统计信息成功', type: TranslationStatsDto })
  async getTranslationStats(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TranslationStatsDto> {
    return await this.articleTranslatorService.getTranslationStats(id);
  }

  @Get('engines')
  @ApiOperation({ summary: '获取支持的翻译引擎列表' })
  @ApiResponse({ status: 200, description: '获取引擎列表成功', type: [String] })
  async getSupportedEngines(): Promise<string[]> {
    return await this.articleTranslatorService.getSupportedEngines();
  }

  @Get('languages')
  @ApiOperation({ summary: '获取支持的语言列表' })
  @ApiQuery({ name: 'engine', required: false, description: '翻译引擎名称' })
  @ApiResponse({ status: 200, description: '获取语言列表成功', type: [String] })
  async getSupportedLanguages(
    @Query('engine') engine?: string,
  ): Promise<string[]> {
    return await this.articleTranslatorService.getSupportedLanguages(engine);
  }
}