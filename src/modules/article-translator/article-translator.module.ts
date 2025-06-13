import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ArticleTranslatorController } from './article-translator.controller';
import { ArticleTranslatorService } from './article-translator.service';
import { TranslatedArticle } from './entities/translated-article.entity';
import { RssArticle } from '../rsshub/entities/rss-article.entity';
import { OpenAITranslationEngine } from './engines/openai-translation.engine';
import { TranslationEngineFactory } from './factories/translation-engine.factory';

@Module({
  imports: [
    TypeOrmModule.forFeature([TranslatedArticle, RssArticle]),
    ConfigModule,
  ],
  controllers: [ArticleTranslatorController],
  providers: [
    ArticleTranslatorService,
    OpenAITranslationEngine,
    TranslationEngineFactory,
  ],
  exports: [ArticleTranslatorService],
})
export class ArticleTranslatorModule {}