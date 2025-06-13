import { ApiProperty } from '@nestjs/swagger';

export class TranslationStatsDto {
  @ApiProperty({ description: '已翻译的语言数量' })
  totalLanguages: number;

  @ApiProperty({ description: '平均翻译质量分数（0-100）' })
  averageQuality: number;

  @ApiProperty({
    description: '各翻译引擎的使用次数',
    example: { openai: 5, google: 3 }
  })
  engineUsage: Record<string, number>;

  @ApiProperty({ description: '最后更新时间' })
  lastUpdated: Date;

  @ApiProperty({
    description: '各语言的翻译耗时（毫秒）',
    example: { 'zh': 1500, 'en': 1200 }
  })
  translationTimes: Record<string, number>;

  @ApiProperty({
    description: '翻译错误信息（如果有）',
    required: false,
    type: 'array',
    items: {
      type: 'object',
      properties: {
        language: { type: 'string' },
        error: { type: 'string' }
      }
    }
  })
  errors?: Array<{ language: string; error: string }>;
}