import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany
} from 'typeorm';
import { RssArticle } from './rss-article.entity';

/**
 * RSS源实体类
 * 用于存储RSS订阅源的相关信息
 */
@Entity('rss_source')
export class RssSource {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 1000,
    nullable: false
  })
  url: string;

  @Column({
    type: 'text',
    nullable: true
  })
  description: string;

  @Column({
    type: 'boolean',
    default: true,
    nullable: false
  })
  active: boolean;

  @Column({
    type: 'int',
    default: 60,
    nullable: false
  })
  update_interval: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    default: null
  })
  last_fetch_time: Date;

  @Column({
    type: 'int',
    default: 0,
    nullable: false
  })
  error_count: number;

  @Column({
    type: 'text',
    nullable: true
  })
  last_error: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true
  })
  custom_selector: string;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: false
  })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
    nullable: false
  })
  updated_at: Date;

  @Column({
    type: 'int',
    nullable: true
  })
  idx_userid: number;

  @OneToMany(() => RssArticle, (article) => article.source)
    articles: RssArticle[]; // 与文章表关联
}