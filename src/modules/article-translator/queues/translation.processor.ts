import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { TranslatorService } from '../services/translator.service';

interface TranslationJob {
  text: string;
  from?: string;
  to: string;
  taskId: string;
  timestamp: Date;
}

@Processor('translation')
export class TranslationProcessor {
  private readonly logger = new Logger(TranslationProcessor.name);

  constructor(private readonly translatorService: TranslatorService) {}

  @Process('translate')
  async handleTranslation(job: Job<TranslationJob>) {
    const { text, from, to, taskId } = job.data;
    this.logger.debug(`Processing translation job ${taskId}`);

    try {
      // 更新任务状态为处理中
      await this.translatorService.updateTaskStatus(
        taskId,
        'processing',
        25,
      );
      await job.progress(25);

      // 执行翻译
      const translatedText = await this.translatorService.translateToLanguage(text, to);
      await job.progress(75);
      
      // 更新任务状态为进行中（75%）
      await this.translatorService.updateTaskStatus(
        taskId,
        'processing',
        75,
      );

      // 更新任务状态为完成
      await this.translatorService.updateTaskStatus(
        taskId,
        'completed',
        100,
        translatedText,
      );
      await job.progress(100);

      return {
        taskId,
        success: true,
        result: translatedText,
      };
    } catch (error) {
      this.logger.error(
        `Translation job ${taskId} failed: ${error.message}`,
        error.stack,
      );

      // 更新任务状态为失败
      await this.translatorService.updateTaskStatus(
        taskId,
        'failed',
        0,
        undefined,
        error.message,
      );

      throw error;
    }
  }
}