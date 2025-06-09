import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { SubscriptionController } from './controllers/subscription.controller';
import { SubscriptionService } from './services/subscription.service';
import { FeedParserService } from './services/feed-parser.service';
import { FeedCronService } from './services/feed-cron.service';
import { Subscription } from './models/subscription.entity';
import { Article } from './models/article.entity';
import { TranslationModule } from '../translation/translation.module';
import { CacheModule } from '../../common/cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, Article]),
    ScheduleModule.forRoot(),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'RSS Reader/1.0',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, application/json',
      },
    }),
    TranslationModule,
    CacheModule,
  ],
  controllers: [SubscriptionController],
  providers: [
    SubscriptionService,
    FeedParserService,
    FeedCronService,
  ],
  exports: [SubscriptionService, FeedParserService],
})
export class SubscriptionModule implements OnModuleInit {
  constructor(private readonly feedCronService: FeedCronService) {}

  async onModuleInit() {
    // 使用 async/await 确保 cron jobs 正确启动
    await this.feedCronService.startCronJobs();
  }
}