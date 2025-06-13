import { Controller, Get, Post, Body, Param, Query, Delete, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ArticleTranslatorService } from '../services/article-translator.service';
import { TranslationRequestDto } from '../dto/translation-request.dto';
import { TranslationConfigDto } from '../dto/translation-config.dto';
import { PurifyOptionsDto } from '../dto/purify-options.dto';

@Controller('article-translator')
export class ArticleTranslatorController {
  private readonly logger = new Logger(ArticleTranslatorController.name);

  constructor(private readonly articleTranslatorService: ArticleTranslatorService) {}

  /**
   * 翻译单篇文章
   * @param articleId 文章ID
   */
  @Post('translate/:articleId')
  async translateArticle(
    @Param('articleId') articleId: number,
    @Body() config?: TranslationConfigDto,
    @Body() purifyOptions?: PurifyOptionsDto,
  ) {
    try {
      return await this.articleTranslatorService.translateArticle(
        articleId,
        config,
        purifyOptions,
      );
    } catch (error) {
      this.logger.error(`Error translating article ${articleId}: ${error.message}`);
      throw new HttpException(
        `Failed to translate article: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 批量翻译文章
   * @param articleIds 文章ID数组
   */
  @Post('translate-batch')
  async translateArticles(
    @Body('articleIds') articleIds: number[],
    @Body('config') config?: TranslationConfigDto,
  ) {
    try {
      return await this.articleTranslatorService.translateArticles(articleIds, config);
    } catch (error) {
      this.logger.error(`Error batch translating articles: ${error.message}`);
      throw new HttpException(
        `Failed to batch translate articles: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取文章的翻译结果
   * @param articleId 文章ID
   */
  @Get('translation/:articleId')
  async getArticleTranslation(@Param('articleId') articleId: number) {
    try {
      // 这里假设已经有翻译，直接获取结果
      return await this.articleTranslatorService.translateArticle(articleId);
    } catch (error) {
      this.logger.error(`Error getting translation for article ${articleId}: ${error.message}`);
      throw new HttpException(
        `Failed to get article translation: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 重试失败的翻译
   */
  @Post('retry-failed')
  async retryFailedTranslations(@Body() config?: TranslationConfigDto) {
    try {
      const successCount = await this.articleTranslatorService.retryFailedTranslations(config);
      return { success: true, retried: successCount };
    } catch (error) {
      this.logger.error(`Error retrying failed translations: ${error.message}`);
      throw new HttpException(
        `Failed to retry translations: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取翻译统计信息
   */
  @Get('stats')
  async getTranslationStats() {
    try {
      return await this.articleTranslatorService.getTranslationStats();
    } catch (error) {
      this.logger.error(`Error getting translation stats: ${error.message}`);
      throw new HttpException(
        `Failed to get translation stats: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 清除特定文章的翻译
   * @param articleId 文章ID
   */
  @Delete('clear/:articleId')
  async clearArticleTranslation(@Param('articleId') articleId: number) {
    try {
      await this.articleTranslatorService.clearArticleTranslation(articleId);
      return { success: true };
    } catch (error) {
      this.logger.error(`Error clearing translation for article ${articleId}: ${error.message}`);
      throw new HttpException(
        `Failed to clear article translation: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 清除所有翻译
   */
  @Delete('clear-all')
  async clearAllTranslations() {
    try {
      await this.articleTranslatorService.clearAllTranslations();
      return { success: true };
    } catch (error) {
      this.logger.error(`Error clearing all translations: ${error.message}`);
      throw new HttpException(
        `Failed to clear all translations: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}