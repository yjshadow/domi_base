import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TranslationJobDto {
  @ApiProperty({
    description: '要翻译的文本',
    example: '这是一段需要翻译的中文文本',
  })
  @IsNotEmpty()
  @IsString()
  text: string;

  @ApiProperty({
    description: '目标语言代码',
    example: 'en',
  })
  @IsNotEmpty()
  @IsString()
  to: string;

  @ApiProperty({
    description: '源语言代码（可选，自动检测）',
    example: 'zh-CN',
    required: false,
  })
  @IsOptional()
  @IsString()
  from?: string;
}

export class TranslationJobResponseDto {
  @ApiProperty({
    description: '翻译任务ID',
    example: 'task_1623456789_abc123',
  })
  taskId: string;

  @ApiProperty({
    description: '任务状态',
    example: 'queued',
    enum: ['queued', 'processing', 'completed', 'failed'],
  })
  status: string;

  @ApiProperty({
    description: '任务创建时间',
    example: '2023-06-01T12:00:00.000Z',
  })
  createdAt: Date;
}