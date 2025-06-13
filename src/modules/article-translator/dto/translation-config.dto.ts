import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, Max, IsEnum } from 'class-validator';

export enum TranslationModel {
  GPT3_5 = 'gpt-3.5-turbo',
  GPT4 = 'gpt-4',
}

export class TranslationConfigDto {
  @ApiPropertyOptional({ description: '源语言（如果不提供将自动检测）' })
  @IsOptional()
  @IsString()
  sourceLanguage?: string;

  @ApiPropertyOptional({ 
    description: '翻译引擎名称',
    default: 'openai'
  })
  @IsOptional()
  @IsString()
  engine?: string;

  @ApiPropertyOptional({ 
    description: '使用的模型',
    enum: TranslationModel,
    default: TranslationModel.GPT3_5
  })
  @IsOptional()
  @IsEnum(TranslationModel)
  model?: TranslationModel;

  @ApiPropertyOptional({ 
    description: '温度参数（0-2）：较低的值使输出更确定，较高的值使输出更多样化',
    minimum: 0,
    maximum: 2,
    default: 0.3
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional({ 
    description: '最大令牌数',
    minimum: 1,
    default: 4096
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTokens?: number;

  @ApiPropertyOptional({ 
    description: '重试次数',
    minimum: 0,
    default: 2
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  retryCount?: number;

  @ApiPropertyOptional({ 
    description: '重试延迟（毫秒）',
    minimum: 0,
    default: 1000
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  retryDelay?: number;

  @ApiPropertyOptional({ 
    description: '是否保存翻译结果到数据库',
    default: true
  })
  @IsOptional()
  saveToDatabase?: boolean;

  @ApiPropertyOptional({ 
    description: '是否强制重新翻译（即使已有翻译）',
    default: false
  })
  @IsOptional()
  forceTranslate?: boolean;
}