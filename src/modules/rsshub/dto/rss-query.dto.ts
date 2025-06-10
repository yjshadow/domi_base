import { IsOptional, IsBoolean, IsInt, Min, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class RssQueryDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @IsString()
  @IsOptional()
  search?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  active?: boolean;
}

export class ArticleQueryDto extends RssQueryDto {
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  sourceId?: number;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isRead?: boolean;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isFavorite?: boolean;

  @IsString()
  @IsOptional()
  @IsIn(['pubDate', 'createdAt'])
  sortBy?: string = 'pubDate';

  @IsString()
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC' = 'DESC';
}