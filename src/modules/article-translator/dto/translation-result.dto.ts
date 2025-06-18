import { ApiProperty } from '@nestjs/swagger';

export class TranslationStatusDto {
  @ApiProperty({
    description: '翻译任务ID',
    example: 'task_1623456789_abc123',
  })
  taskId: string;

  @ApiProperty({
    description: '任务状态',
    example: 'processing',
    enum: ['queued', 'processing', 'completed', 'failed'],
  })
  status: string;

  @ApiProperty({
    description: '翻译进度（0-100）',
    example: 45,
    minimum: 0,
    maximum: 100,
  })
  progress: number;
}

export class TranslationResultDto extends TranslationStatusDto {
  @ApiProperty({
    description: '翻译结果',
    example: 'This is the translated text.',
    required: false,
  })
  result?: string;

  @ApiProperty({
    description: '错误信息（如果失败）',
    example: 'Translation service unavailable',
    required: false,
  })
  error?: string;

  @ApiProperty({
    description: '最后更新时间',
    example: '2023-06-01T12:05:30.000Z',
  })
  updatedAt: Date;
}

// 定义任务类型（用于服务内部）
export interface TranslationTask {
  taskId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}