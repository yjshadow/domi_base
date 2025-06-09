import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { Subscription } from './subscription.entity';

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  subscriptionId: number;

  @ManyToOne(() => Subscription, subscription => subscription.articles)
  @JoinColumn({ name: 'subscriptionId' })
  subscription: Subscription;

  @Column({ length: 512 })
  title: string;

  @Column({ length: 512, nullable: true })
  translatedTitle?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  translatedDescription?: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  translatedContent?: string;

  @Column({ length: 512 })
  @Index()
  link: string;

  @Column({ length: 512 })
  @Index({ unique: true })
  guid: string;

  @Column({ length: 255, nullable: true })
  author?: string;

  @Column({ length: 512, nullable: true })
  imageUrl?: string;

  @Column({ type: 'timestamp' })
  @Index()
  publishedAt: Date;

  @Column({ type: 'simple-array', nullable: true })
  categories?: string[];

  @Column({ default: false })
  @Index()
  isRead: boolean;

  @Column({ default: false })
  @Index()
  isFavorite: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  translatedAt?: Date;

  @Column({ length: 10, nullable: true })
  sourceLanguage?: string;

  @Column({ default: 0 })
  translationRetries: number;

  @Column({ nullable: true })
  lastTranslationError?: string;
}