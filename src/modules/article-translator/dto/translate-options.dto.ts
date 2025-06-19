import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class TranslateOptionsDto {
  @ApiProperty({
    description: '目标语言列表，使用ISO 639-1语言代码',
    example: ['en', 'zh', 'ja', 'ko'],
    required: false,
    default: ['en', 'zh', 'ja'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetLanguages?: string[] = ['en', 'zh', 'ja'];

  @ApiProperty({
    description: '是否在翻译前进行文本提炼',
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  purifyBeforeTranslation?: boolean = true;

  @ApiProperty({
    description: '是否使用缓存的翻译结果',
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  useCache?: boolean = true;

  @ApiProperty({
    description: '是否异步处理翻译（不阻塞请求）',
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  async?: boolean = false;
}