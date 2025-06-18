import { Body, Controller, Get, Param, Post, Delete } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TranslatorService } from '../services/translator.service';
import { PurifierService } from '../services/purifier.service';
import { TranslateTextDto, TranslatedTextResponseDto } from '../dto/translate-text.dto';
import { TranslateOptionsDto } from '../dto/translate-options.dto';
import { PurifyOptionsDto } from '../dto/purify-options.dto';
import { TranslationJobDto, TranslationJobResponseDto } from '../dto/translation-job.dto';
import { TranslationResultDto, TranslationStatusDto } from '../dto/translation-result.dto';
import { CachedTranslationsResponseDto, ClearCacheResponseDto } from '../dto/cached-translation.dto';
import { Public } from 'src/modules/auth/public.decorator';

@ApiTags('文本翻译')
@Controller('api/translator')
export class TranslatorController {
  constructor(
    private readonly translatorService: TranslatorService,
    private readonly purifierService: PurifierService,
  ) {}

  @Public()
  @Post('translate-async')
  @ApiOperation({ summary: '异步翻译文本（创建翻译任务）' })
  @ApiResponse({
    status: 201,
    description: '返回创建的翻译任务信息',
    type: TranslationJobResponseDto,
  })
  async createTranslationJob(@Body() dto: TranslationJobDto): Promise<TranslationJobResponseDto> {
    const task = await this.translatorService.createTranslationTask(
      dto.text,
      dto.to,
      dto.from,
    );

    return {
      taskId: task.taskId,
      status: task.status,
      createdAt: task.createdAt,
    };
  }

  @Public()
  @Get('task-status/:taskId')
  @ApiOperation({ summary: '获取翻译任务状态' })
  @ApiParam({ name: 'taskId', description: '翻译任务ID' })
  @ApiResponse({
    status: 200,
    description: '返回翻译任务状态',
    type: TranslationStatusDto,
  })
  async getTaskStatus(@Param('taskId') taskId: string): Promise<TranslationStatusDto> {
    const task = await this.translatorService.getTaskStatus(taskId);
    
    return {
      taskId: task.taskId,
      status: task.status,
      progress: task.progress,
    };
  }

  @Public()
  @Get('translation-result/:taskId')
  @ApiOperation({ summary: '获取翻译结果' })
  @ApiParam({ name: 'taskId', description: '翻译任务ID' })
  @ApiResponse({
    status: 200,
    description: '返回翻译结果',
    type: TranslationResultDto,
  })
  async getTranslationResult(@Param('taskId') taskId: string): Promise<TranslationResultDto> {
    const task = await this.translatorService.getTaskStatus(taskId);
    
    return {
      taskId: task.taskId,
      status: task.status,
      result: task.result,
      error: task.error,
      progress: task.progress,
      updatedAt: task.updatedAt,
    };
  }

  @Public()
  @Post('translate')
  @ApiOperation({ summary: '翻译文本内容' })
  @ApiResponse({
    status: 200,
    description: '返回翻译后的文本内容',
    type: TranslatedTextResponseDto,
  })
  async translateText(@Body() dto: TranslateTextDto): Promise<TranslatedTextResponseDto> {
    const options = dto.options || new TranslateOptionsDto();
    
    // 处理标题和内容
    let titleToTranslate = dto.title;
    let contentToTranslate = dto.content;
    
    // 如果需要先提炼文本
    if (options.purifyBeforeTranslation) {
      const purifyOptions = new PurifyOptionsDto();
      purifyOptions.maxLength = 100; // 标题通常较短
      titleToTranslate = await this.purifierService.purifyText(dto.title, purifyOptions);
      
      purifyOptions.maxLength = 400; // 内容可以稍长
      contentToTranslate = await this.purifierService.purifyText(dto.content, purifyOptions);
    }
    
    // 翻译标题和内容
    const [translatedTitles, translatedContents] = await Promise.all([
      this.translatorService.translateText(titleToTranslate, options),
      this.translatorService.translateText(contentToTranslate, options),
    ]);
    
    return {
      originalTitle: dto.title,
      originalContent: dto.content,
      title: translatedTitles,
      content: translatedContents,
    };
  }

  @Public()
  @Get('cache')
  @ApiOperation({ summary: '获取所有翻译缓存' })
  @ApiResponse({
    status: 200,
    description: '返回所有缓存的翻译',
    type: CachedTranslationsResponseDto,
  })
  async getAllCachedTranslations(): Promise<CachedTranslationsResponseDto> {
    const translations = await this.translatorService.getAllCachedTranslations();
    
    return {
      translations,
      count: translations.length,
    };
  }

  @Public()
  @Delete('cache')
  @ApiOperation({ summary: '清除所有翻译缓存' })
  @ApiResponse({
    status: 200,
    description: '返回清除缓存的结果',
    type: ClearCacheResponseDto,
  })
  async clearAllTranslationCache(): Promise<ClearCacheResponseDto> {
    try {
      const success = await this.translatorService.clearAllTranslationCache();
      
      if (success) {
        return {
          success: true,
          clearedCount: 0, // 由于我们没有跟踪清除的确切数量，这里设为0
        };
      } else {
        return {
          success: false,
          error: '清除缓存失败',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `清除缓存时发生错误: ${error.message}`,
      };
    }
  }
}