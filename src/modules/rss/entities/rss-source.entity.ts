import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { RssArticle } from './rss-article.entity';

@Entity('rss_source')
export class RssSource {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ length: 1000 })
  url: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  active: boolean;

  @Column({ default: 60 })
  update_interval: number; // 更新间隔，单位：分钟

  @Column({ type: 'timestamp', nullable: true })
  last_fetch_time: Date;

  @Column({ default: 0 })
  error_count: number;

  @Column({ type: 'text', nullable: true })
  last_error: string;

  @Column({ nullable: true })
  custom_selector: string; // 自定义选择器，用于提取内容

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => RssArticle, (article) => article.source)
  articles: RssArticle[];
}