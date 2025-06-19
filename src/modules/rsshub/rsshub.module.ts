import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
import { RsshubService } from './rsshub.service';
import { ArticlePurifierService } from '../rsshub/services/article-purifier.service';
import { RssArticle } from "./entities/rss-article.entity";
import { RssSource } from "./entities/rss-source.entity";
import {RsshubController} from "./rsshub.controller";
import { FetchProgress } from './entities/fetch-progress.entity';
import { ArticleTranslatorModule } from '../article-translator/article-translator.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RssSource,RssArticle,FetchProgress]),
    ArticleTranslatorModule,
    // 添加BullModule以解决依赖注入问题
    BullModule.registerQueue({
      name: 'translation',
      defaultJobOptions: {
        removeOnComplete: true,
        attempts: 3,
      },
      limiter: {
        max: 5,
        duration: 1000,
      },
    }),
    // 添加CacheModule以解决依赖注入问题
    CacheModule.register({
      ttl: 24 * 60 * 60 * 1000, // 默认缓存24小时
      max: 1000, // 最多缓存1000条记录
    }),
  ],
  controllers: [RsshubController],
  providers: [RsshubService,ArticlePurifierService],
  exports: [RsshubService,ArticlePurifierService]
})
export class RsshubModule {}