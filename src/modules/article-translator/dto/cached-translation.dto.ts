import { ApiProperty } from '@nestjs/swagger';

export class CachedTranslationDto {
  @ApiProperty({ description: '缓存键' })
  key: string;

  @ApiProperty({ description: '原始文本' })
  originalText: string;

  @ApiProperty({ description: '目标语言列表', type: [String] })
  targetLanguages: string[];

  @ApiProperty({ description: '翻译结果', type: Object })
  translations: Record<string, string>;

  @ApiProperty({ description: '缓存创建时间' })
  createdAt: Date;
}

export class CachedTranslationsResponseDto {
  @ApiProperty({ description: '缓存的翻译列表', type: [CachedTranslationDto] })
  translations: CachedTranslationDto[];

  @ApiProperty({ description: '缓存总数' })
  count: number;
}

export class ClearCacheResponseDto {
  @ApiProperty({ description: '操作是否成功' })
  success: boolean;

  @ApiProperty({ description: '清除的缓存数量' })
  clearedCount?: number;

  @ApiProperty({ description: '错误信息（如果有）' })
  error?: string;
}