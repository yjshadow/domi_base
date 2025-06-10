import { PartialType } from '@nestjs/mapped-types';
import { CreateRssSourceDto } from './create-rss-source.dto';

export class UpdateRssSourceDto extends PartialType(CreateRssSourceDto) {}