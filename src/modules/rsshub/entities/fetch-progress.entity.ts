import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('fetch_progress')
export class FetchProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sourceId: number;

  @Column('simple-json', { nullable: true })
  lastProcessedItem: {
    guid: string;
    publishDate: string;
  };

  @Column('simple-json', { nullable: true })
  failedItems: Array<{
    guid: string;
    error: string;
    retryCount: number;
    lastRetry: string;
  }>;

  @Column({ default: 0 })
  processedCount: number;

  @Column({ default: 0 })
  totalCount: number;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ nullable: true })
  lastError: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}