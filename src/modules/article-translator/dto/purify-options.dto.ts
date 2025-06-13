import { IsBoolean, IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PurifyOptionsDto {
  @ApiPropertyOptional({ description: '是否移除HTML标签', default: true })
  @IsBoolean()
  @IsOptional()
  removeHtml: boolean = true;

  @ApiPropertyOptional({ description: '是否移除多余空白字符', default: true })
  @IsBoolean()
  @IsOptional()
  removeExcessWhitespace: boolean = true;

  @ApiPropertyOptional({ description: '是否移除表情符号', default: false })
  @IsBoolean()
  @IsOptional()
  removeEmojis: boolean = false;

  @ApiPropertyOptional({ description: '是否移除URL链接', default: false })
  @IsBoolean()
  @IsOptional()
  removeUrls: boolean = false;

  @ApiPropertyOptional({ description: '是否移除话题标签(#hashtags)', default: false })
  @IsBoolean()
  @IsOptional()
  removeHashtags: boolean = false;

  @ApiPropertyOptional({ description: '是否移除提及(@mentions)', default: false })
  @IsBoolean()
  @IsOptional()
  removeMentions: boolean = false;

  @ApiPropertyOptional({ description: '内容最大长度', default: 10000 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxLength: number = 10000;

  @ApiPropertyOptional({ description: '截断标记', default: '...' })
  @IsString()
  @IsOptional()
  truncationMarker: string = '...';
}