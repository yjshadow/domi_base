import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { RssController } from './rss.controller';
import { RssService } from './rss.service';
import { RssSchedulerService } from './rss-scheduler.service';
import { ArticlePurifierService } from '../rsshub/services/article-purifier.service';
import { RssSource } from './entities/rss-source.entity';
import { Article } from '../subscription/models/article.entity';
import { FetchProgress } from './entities/fetch-progress.entity';
import { TranslationModule } from '../translation/translation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RssSource, Article, FetchProgress]),
    ScheduleModule.forRoot(),
    TranslationModule,
  ],
  controllers: [RssController],
  providers: [RssService, RssSchedulerService, ArticlePurifierService],
  exports: [RssService, RssSchedulerService ],
})
export class RssModule {}