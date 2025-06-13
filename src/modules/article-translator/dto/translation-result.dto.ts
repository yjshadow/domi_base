import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TranslationUsageDto {
  @ApiPropertyOptional({ description: '使用的令牌数量' })
  tokens?: number;

  @ApiPropertyOptional({ description: '输入令牌数量' })
  promptTokens?: number;

  @ApiPropertyOptional({ description: '输出令牌数量' })
  completionTokens?: number;

  @ApiPropertyOptional({ description: '花费的金额（如果适用）' })
  cost?: number;

  @ApiPropertyOptional({ description: '使用的模型' })
  model?: string;
}

export class TranslationDto {
  @ApiProperty({ description: '翻译后的标题' })
  title: string;

  @ApiProperty({ description: '翻译后的内容' })
  content: string;

  @ApiPropertyOptional({ description: '翻译质量评分（0-100）' })
  quality?: number;

  @ApiProperty({ description: '使用的翻译引擎' })
  engine: string;

  @ApiPropertyOptional({ description: '使用信息', type: TranslationUsageDto })
  usageInfo?: TranslationUsageDto;

  @ApiPropertyOptional({ description: '额外元数据', type: 'object' })
  metadata?: Record<string, any>;

  @ApiProperty({ description: '翻译更新时间' })
  updatedAt: Date;
}

export class TranslationMetadataDto {
  @ApiPropertyOptional({ description: '默认翻译引擎' })
  defaultEngine?: string;

  @ApiPropertyOptional({ description: '最后一次翻译信息' })
  lastTranslation?: {
    language: string;
    timestamp: Date;
  };

  @ApiPropertyOptional({ description: '翻译统计信息' })
  statistics?: {
    totalTranslations: number;
    languageCounts: Record<string, number>;
    engineUsage: Record<string, number>;
  };
}

export class TranslationResultDto {
  @ApiProperty({ description: '文章ID' })
  articleId: number;

  @ApiProperty({ description: '原始标题' })
  originalTitle: string;

  @ApiProperty({ description: '原始内容' })
  originalContent: string;

  @ApiProperty({ description: '源语言' })
  sourceLanguage: string;

  @ApiProperty({ description: '翻译结果', type: 'object', additionalProperties: { type: 'object', $ref: '#/components/schemas/TranslationDto' } })
  translations: Record<string, TranslationDto>;

  @ApiPropertyOptional({ description: '翻译元数据', type: TranslationMetadataDto })
  translationMetadata?: TranslationMetadataDto;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

export class SingleTranslationResultDto {
  @ApiProperty({ description: '翻译ID' })
  id: number;

  @ApiProperty({ description: '文章ID' })
  articleId: number;

  @ApiProperty({ description: '翻译后的标题' })
  title: string;

  @ApiProperty({ description: '翻译后的内容' })
  content: string;

  @ApiProperty({ description: '目标语言' })
  language: string;

  @ApiProperty({ description: '使用的翻译引擎' })
  engine: string;

  @ApiProperty({ description: '翻译质量评分（0-100）' })
  quality: number;

  @ApiPropertyOptional({ description: '使用信息', type: TranslationUsageDto })
  usageInfo?: TranslationUsageDto;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}