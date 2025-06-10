import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { RsshubService } from './rsshub.service';
import { ArticlePurifierService } from '../rsshub/services/article-purifier.service';
import { RssArticle } from "./entities/rss-article.entity";
import { RssSource } from "./entities/rss-source.entity";
import {RsshubController} from "./rsshub.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([RssSource,RssArticle]),
  ],
  controllers: [RsshubController],
  providers: [RsshubService,ArticlePurifierService],
  exports: [RsshubService,ArticlePurifierService]
})
export class RsshubModule {}
