import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { RssArticle } from '../../rsshub/entities/rss-article.entity';

interface Translation {
  title: string;
  content: string;
  quality?: number;
  engine: string;
  usageInfo?: any;
  metadata?: any;
  updatedAt: Date;
}

@Entity('translated_articles')
export class TranslatedArticle {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => RssArticle, article => article.translatedArticle)
  @JoinColumn()
  article: RssArticle;

  @Column({ nullable: true })
  originalTitle: string;

  @Column({ type: 'text', nullable: true })
  originalContent: string;

  @Column({ nullable: true })
  sourceLanguage: string;

  @Column({ type: 'json', default: {} })
  translations: Record<string, Translation>;

  @Column({ type: 'json', nullable: true })
  translationMetadata: {
    defaultEngine?: string;
    lastTranslation?: {
      language: string;
      timestamp: Date;
    };
    statistics?: {
      totalTranslations: number;
      languageCounts: Record<string, number>;
      engineUsage: Record<string, number>;
    };
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * 获取指定语言的翻译
   * @param language 目标语言
   * @returns 翻译结果或undefined
   */
  getTranslation(language: string): Translation | undefined {
    return this.translations[language];
  }

  /**
   * 添加或更新翻译
   * @param language 目标语言
   * @param translation 翻译内容
   */
  setTranslation(language: string, translation: Omit<Translation, 'updatedAt'>) {
    this.translations[language] = {
      ...translation,
      updatedAt: new Date(),
    };

    // 更新统计信息
    if (!this.translationMetadata) {
      this.translationMetadata = {
        statistics: {
          totalTranslations: 0,
          languageCounts: {},
          engineUsage: {},
        },
      };
    }

    const stats = this.translationMetadata.statistics;
    if (!this.translations[language]) {
      stats.totalTranslations++;
      stats.languageCounts[language] = (stats.languageCounts[language] || 0) + 1;
    }
    stats.engineUsage[translation.engine] = (stats.engineUsage[translation.engine] || 0) + 1;

    // 更新最后翻译信息
    this.translationMetadata.lastTranslation = {
      language,
      timestamp: new Date(),
    };
  }

  /**
   * 获取所有可用的翻译语言
   */
  getAvailableLanguages(): string[] {
    return Object.keys(this.translations);
  }

  /**
   * 检查指定语言的翻译是否存在
   * @param language 目标语言
   */
  hasTranslation(language: string): boolean {
    return language in this.translations;
  }
}