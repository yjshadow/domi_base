import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class PurifyOptionsDto {
  @ApiProperty({ description: '是否提取标题', default: true })
  @IsBoolean()
  extractTitle: boolean;

  @ApiProperty({ description: '是否提取描述', default: true })
  @IsBoolean()
  extractDescription: boolean;

  @ApiProperty({ description: '是否提取作者', default: false })
  @IsBoolean()
  extractAuthor: boolean;

  @ApiProperty({ description: '是否提取发布时间', default: true })
  @IsBoolean()
  extractPublishDate: boolean;

  @ApiProperty({ description: '是否提取正文内容', default: true })
  @IsBoolean()
  extractContent: boolean;

  @ApiProperty({ description: '标题选择器', required: false })
  @IsString()
  @IsOptional()
  titleSelector?: string;

  @ApiProperty({ description: '描述选择器', required: false })
  @IsString()
  @IsOptional()
  descriptionSelector?: string;

  @ApiProperty({ description: '作者选择器', required: false })
  @IsString()
  @IsOptional()
  authorSelector?: string;

  @ApiProperty({ description: '发布时间选择器', required: false })
  @IsString()
  @IsOptional()
  publishDateSelector?: string;

  @ApiProperty({ description: '正文内容选择器', required: false })
  @IsString()
  @IsOptional()
  contentSelector?: string;
}