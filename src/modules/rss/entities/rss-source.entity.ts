import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index
} from 'typeorm';
import { RssArticle } from './rss-article.entity';

@Entity('rss_source') // RSS源表
export class RssSource {
  @PrimaryGeneratedColumn({type: 'bigint'})
  id: number; // 主键ID

  @Column({type: 'varchar', length: 100})
  name: string; // RSS源名称

  @Column({type: 'varchar', length: 1000})
  url: string; // RSS源URL地址

  @Column({type: 'text', nullable: true})
  description: string; // RSS源描述

  @Column({type: 'boolean', default: true})
  active: boolean; // 是否激活

  @Column({type: 'int', default: 60})
  update_interval: number; // 更新间隔，单位：分钟

  @Column({type: 'timestamp', nullable: true})
  last_fetch_time: Date; // 上次更新时间

  @Column({type: 'int', default: 0})
  error_count: number; // 错误次数

  @Column({type: 'text', nullable: true})
  last_error: string; // 上次错误信息

  @Column({type: 'varchar', length: 255, nullable: true})
  custom_selector: string; // 自定义选择器，用于提取内容

  @CreateDateColumn({type: 'timestamp', default: () => 'CURRENT_TIMESTAMP'})
  created_at: Date; // 创建时间

  @UpdateDateColumn({type: 'timestamp', default: () => 'CURRENT_TIMESTAMP'})
  updated_at: Date; // 更新时间

  @Column({type: 'int', nullable: true})
  idx_userid: number; // 用户ID，关联用户表

  @OneToMany(() => RssArticle, (article) => article.source)
  articles: RssArticle[]; // 与文章表关联
}