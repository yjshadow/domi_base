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
  id: number; // 主键，自增

  @Column()
  @Index('idx_rss_article_source_id')
  source_id: number; // 订阅源ID

  @Column({ length: 500 })
  title: string; // 文章标题

  @Column({ type: 'text', nullable: true })
  description: string; // 文章描述

  @Column({ type: 'longtext', nullable: true })
  content: string; // 文章内容

  @Column({ length: 1000 })
  link: string; // 文章链接

  @Column({ length: 500 })
  @Index('idx_rss_article_guid')
  guid: string; // 文章GUID

  @Column({ nullable: true })
  author: string; // 文章作者

  @Column({ type: 'timestamp' })
  @Index('idx_rss_article_pub_date')
  pub_date: Date; // 文章发布日期

  @Column({ type: 'json', nullable: true })
  categories: string[]; // 文章分类

  @Column({ default: false })
  is_read: boolean; // 是否已读

  @Column({ default: false })
  is_favorite: boolean; // 是否收藏

  @Column({ type: 'text', nullable: true })
  translated_title: string; // 翻译后的标题

  @Column({ type: 'longtext', nullable: true })
  translated_content: string; // 翻译后的内容

  @Column({ type: 'text', nullable: true })
  translated_description: string; // 翻译后的描述

  @CreateDateColumn()
  created_at: Date; // 创建时间

  @UpdateDateColumn()
  updated_at: Date; // 更新时间

  @ManyToOne(() => RssSource, (source) => source.articles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'source_id' })
  source: RssSource; // 关联的RSS源
}
