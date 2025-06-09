import { IsNotEmpty, IsUrl, IsString, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';

export class CreateRssSourceDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440) // 最大24小时
  update_interval?: number;

  @IsOptional()
  @IsString()
  custom_selector?: string;
}