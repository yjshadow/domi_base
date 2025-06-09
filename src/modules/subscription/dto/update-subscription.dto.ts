import { IsString, IsUrl, IsEnum, IsInt, IsBoolean, IsOptional, Min, Max, Length, Matches } from 'class-validator';
import { FeedType, SubscriptionStatus } from '../models/subscription.entity';

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  title?: string;

  @IsOptional()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
  })
  @Length(1, 512)
  feedUrl?: string;

  @IsOptional()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
  })
  @Length(1, 512)
  siteUrl?: string;

  @IsOptional()
  @IsString()
  @Length(1, 1024)
  description?: string;

  @IsOptional()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
  })
  @Length(1, 512)
  imageUrl?: string;

  @IsOptional()
  @IsEnum(FeedType)
  feedType?: FeedType;

  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  updateInterval?: number;

  @IsOptional()
  @IsBoolean()
  autoTranslate?: boolean;

  @IsOptional()
  @IsString()
  @Length(2, 10)
  @Matches(/^[a-zA-Z-]+$/, {
    message: 'sourceLanguage must be a valid language code (e.g., en, zh-CN)',
  })
  sourceLanguage?: string;

  @IsOptional()
  @IsString()
  @Length(2, 10)
  @Matches(/^[a-zA-Z-]+$/, {
    message: 'targetLanguage must be a valid language code (e.g., en, zh-CN)',
  })
  targetLanguage?: string;
}