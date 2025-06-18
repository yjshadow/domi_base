import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bull';
import { PurifierService } from './services/purifier.service';
import { TranslatorService } from './services/translator.service';
import { PurifierController } from './controllers/purifier.controller';
import { TranslatorController } from './controllers/translator.controller';
import { TranslationProcessor } from './processors/translation.processor';

@Module({
  imports: [
    ConfigModule, // 导入ConfigModule以使用环境变量
    CacheModule.register({
      ttl: 24 * 60 * 60 * 1000, // 默认缓存24小时
      max: 1000, // 最多缓存1000条记录
    }),
    BullModule.registerQueue({
      name: 'translation', // 队列名称，与TranslatorService中注入的队列名称一致
      defaultJobOptions: {
        removeOnComplete: true, // 完成后删除任务数据
        attempts: 3, // 默认失败重试次数
      },
      limiter: {
        max: 5, // 最大并发任务数
        duration: 1000, // 时间窗口（毫秒）
      },
    }),
  ],
  controllers: [
    PurifierController,
    TranslatorController,
  ],
  providers: [
    PurifierService,
    TranslatorService,
    TranslationProcessor,
  ],
  exports: [
    PurifierService,
    TranslatorService,
  ],
})
export class ArticleTranslatorModule {}