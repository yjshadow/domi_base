import { IsString, IsArray, IsOptional, IsObject, ValidateNested, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PurifyOptionsDto } from './purify-options.dto';

export class TranslationConfigDto {
  @ApiPropertyOptional({ description: '翻译温度（0-1），越高结果越多样化', minimum: 0, maximum: 1 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  temperature?: number;

  @ApiPropertyOptional({ description: '重试次数', minimum: 1 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  retryCount?: number;

  @ApiPropertyOptional({ description: '重试延迟（毫秒）', minimum: 100 })
  @IsNumber()
  @IsOptional()
  @Min(100)
  retryDelay?: number;
}

export class TranslationRequestDto {
  @ApiPropertyOptional({ description: '目标语言代码数组，如["zh", "en"]' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  languages?: string[];

  @ApiPropertyOptional({ description: '翻译引擎名称' })
  @IsString()
  @IsOptional()
  engine?: string;

  @ApiPropertyOptional({ description: '翻译配置' })
  @IsObject()
  @ValidateNested()
  @Type(() => TranslationConfigDto)
  @IsOptional()
  config?: TranslationConfigDto;

  @ApiPropertyOptional({ description: '内容净化选项' })
  @IsObject()
  @ValidateNested()
  @Type(() => PurifyOptionsDto)
  @IsOptional()
  purifyOptions?: PurifyOptionsDto;
}