import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Article } from './article.entity';

export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
}

export enum FeedType {
  RSS = 'rss',
  ATOM = 'atom',
  JSON = 'json',
}

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  title: string;

  @Column({ length: 512 })
  @Index({ unique: true })
  feedUrl: string;

  @Column({ length: 512, nullable: true })
  siteUrl?: string;

  @Column({ length: 1024, nullable: true })
  description?: string;

  @Column({ length: 512, nullable: true })
  imageUrl?: string;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  @Index()
  status: SubscriptionStatus;

  @Column({
    type: 'enum',
    enum: FeedType,
    default: FeedType.RSS,
  })
  feedType: FeedType;

  @Column({ default: 60 })
  updateInterval: number;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  lastUpdatedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastSuccessfulUpdateAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  lastErrorAt?: Date;

  @Column({ nullable: true })
  error?: string;

  @Column({ default: 0 })
  errorCount: number;

  @Column({ default: true })
  autoTranslate: boolean;

  @Column({ length: 10, default: 'auto' })
  sourceLanguage: string;

  @Column({ length: 10, default: 'zh-CN' })
  targetLanguage: string;

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Article, article => article.subscription)
  articles: Article[];

  // 虚拟属性，不会存储在数据库中
  totalArticles?: number;
}