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
  active: boolean;//是否激活

  @Column({ default: 60 })
  update_interval: number; // 更新间隔，单位：分钟

  @Column({ type: 'timestamp', nullable: true })
  last_fetch_time: Date;//上次更新时间

  @Column({ default: 0 })
  error_count: number;//错误次数

  @Column({ type: 'text', nullable: true })
  last_error: string;//上次错误信息

  @Column({ nullable: true })
  custom_selector: string; // 自定义选择器，用于提取内容

  @CreateDateColumn()
  created_at: Date;//创建时间

  @UpdateDateColumn()
  updated_at: Date;//更新时间

  @OneToMany(() => RssArticle, (article) => article.source)
  articles: RssArticle[];//与文章表关联
}