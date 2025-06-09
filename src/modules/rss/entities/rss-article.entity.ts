import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { RssSource } from './rss-source.entity';

@Entity('rss_article')
export class RssArticle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index('idx_rss_article_source_id')
  source_id: number;

  @Column({ length: 500 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'longtext', nullable: true })
  content: string;

  @Column({ length: 1000 })
  link: string;

  @Column({ length: 500 })
  @Index('idx_rss_article_guid')
  guid: string;

  @Column({ nullable: true })
  author: string;

  @Column({ type: 'timestamp' })
  @Index('idx_rss_article_pub_date')
  pub_date: Date;

  @Column({ type: 'json', nullable: true })
  categories: string[];

  @Column({ default: false })
  is_read: boolean;

  @Column({ default: false })
  is_favorite: boolean;

  @Column({ type: 'text', nullable: true })
  translated_title: string;

  @Column({ type: 'longtext', nullable: true })
  translated_content: string;

  @Column({ type: 'text', nullable: true })
  translated_description: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => RssSource, (source) => source.articles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'source_id' })
  source: RssSource;
}