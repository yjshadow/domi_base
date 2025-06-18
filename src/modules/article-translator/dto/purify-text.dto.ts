import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { PurifyOptionsDto } from './purify-options.dto';

export class PurifyTextDto {
  @ApiProperty({
    description: '需要提炼的文本内容',
    example: '这是一段需要提炼的长文本，可能包含冗余信息和不必要的细节...',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: '提炼选项',
    type: PurifyOptionsDto,
    required: false,
  })
  @IsObject()
  @IsOptional()
  options?: PurifyOptionsDto;
}

export class PurifiedTextResponseDto {
  @ApiProperty({
    description: '原始文本内容',
  })
  original: string;

  @ApiProperty({
    description: '提炼后的文本内容',
  })
  purified: string;
}