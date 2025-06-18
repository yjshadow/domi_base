import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { TranslateOptionsDto } from './translate-options.dto';

export class TranslateTextDto {
  @ApiProperty({
    description: '需要翻译的标题',
    example: '这是一个示例标题',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: '需要翻译的内容',
    example: '这是一段需要翻译的内容...',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: '翻译选项',
    type: TranslateOptionsDto,
    required: false,
  })
  @IsObject()
  @IsOptional()
  options?: TranslateOptionsDto;
}

export class TranslatedTextResponseDto {
  @ApiProperty({
    description: '原始标题',
  })
  originalTitle: string;

  @ApiProperty({
    description: '原始内容',
  })
  originalContent: string;

  @ApiProperty({
    description: '翻译后的标题（按语言）',
    example: {
      en: 'Example Title',
      zh: '示例标题',
      ja: 'サンプルタイトル',
    },
  })
  title: Record<string, string>;

  @ApiProperty({
    description: '翻译后的内容（按语言）',
    example: {
      en: 'This is the translated content...',
      zh: '这是翻译后的内容...',
      ja: 'これは翻訳されたコンテンツです...',
    },
  })
  content: Record<string, string>;
}