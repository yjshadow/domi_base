import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToOne
} from 'typeorm';
import { RssSource } from './rss-source.entity';


/**
 * RSS文章实体类
 * 用于存储RSS订阅源的文章内容
 */
@Entity('rss_article')
export class RssArticle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'int',
    nullable: false
  })
  @Index('idx_rss_article_source_id')
  source_id: number;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: false
  })
  title: string;

  @Column({
    type: 'text',
    nullable: true
  })
  description: string;

  @Column({
    type: 'longtext',
    nullable: true
  })
  content: string;

  @Column({
    type: 'varchar',
    length: 1000,
    nullable: false
  })
  link: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: false
  })
  @Index('idx_rss_article_guid')
  guid: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true
  })
  author: string;

  @Column({
    type: 'timestamp',
    nullable: false
  })
  @Index('idx_rss_article_pub_date')
  pub_date: Date;

  @Column({
    type: 'json',
    nullable: true
  })
  categories: any;

  @Column({
    type: 'boolean',
    default: false,
    nullable: false
  })
  is_read: boolean;

  @Column({
    type: 'boolean',
    default: false,
    nullable: false
  })
  is_favorite: boolean;

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
    type: 'text',
    nullable: true
  })
  translated_title: string;

  @Column({
    type: 'simple-json',
    nullable: true
  })
  translated_content: {[key:string]:any};

  @Column({
    type: 'text',
    nullable: true
  })
  translated_description: string;

  @ManyToOne(() => RssSource, (source) => source.id, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'source_id' })
  source: RssSource;

}