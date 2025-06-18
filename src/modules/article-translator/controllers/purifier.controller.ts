import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PurifierService } from '../services/purifier.service';
import { PurifyOptionsDto } from '../dto/purify-options.dto';
import { PurifyTextDto, PurifiedTextResponseDto } from '../dto/purify-text.dto';
import { Public } from '../../auth/public.decorator'

@ApiTags('文本提炼')
@Controller('api/purifier')
export class PurifierController {
  constructor(private readonly purifierService: PurifierService) {}

  @Public()
  @Post('purify')
  @ApiOperation({ summary: '提炼文本内容' })
  @ApiResponse({
    status: 200,
    description: '返回提炼后的文本内容',
    type: PurifiedTextResponseDto,
  })
  async purifyText(@Body() dto: PurifyTextDto): Promise<PurifiedTextResponseDto> {
    const options = dto.options || new PurifyOptionsDto();
    const purifiedText = await this.purifierService.purifyText(dto.content, options);
    return {
      original: dto.content,
      purified: purifiedText,
    };
  }
}