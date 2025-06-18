import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PurifyOptionsDto {
  @ApiProperty({
    description: '是否移除HTML标签',
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  removeHtml?: boolean = true;

  @ApiProperty({
    description: '是否移除多余空白字符',
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  removeExcessWhitespace?: boolean = true;

  @ApiProperty({
    description: '是否移除表情符号',
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  removeEmojis?: boolean = false;

  @ApiProperty({
    description: '是否移除URL链接',
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  removeUrls?: boolean = false;

  @ApiProperty({
    description: '是否移除话题标签',
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  removeHashtags?: boolean = false;

  @ApiProperty({
    description: '是否移除@提及',
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  removeMentions?: boolean = false;

  @ApiProperty({
    description: '最大字符长度',
    required: false,
    default: 400,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(1000)
  maxLength?: number = 400;

  @ApiProperty({
    description: '截断标记',
    required: false,
    default: '...',
  })
  @IsString()
  @IsOptional()
  truncationMarker?: string = '...';

  @ApiProperty({
    description: '是否使用AI提炼',
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  useAiPurification?: boolean = true;
}