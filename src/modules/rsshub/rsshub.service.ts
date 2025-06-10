import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { RssArticle } from "./entities/rss-article.entity";
import { RssSource } from "./entities/rss-source.entity";
import { Repository } from "typeorm";
import { CreateRssSourceDto } from "./dto/create-rss-source.dto";

@Injectable()
export class RsshubService {
    constructor(
    @InjectRepository(RssSource)
    private readonly rssSourceRepository: Repository<RssSource>,
    @InjectRepository(RssArticle)
    private readonly articleRepository: Repository<RssArticle>,
    ) {
    }

    /**
       * RSS源管理
       * 创建新的RSS订阅源
       * @param createRssSourceDto RSS源创建参数
       * @returns 创建的RSS源实体
       */
      async createSource(createRssSourceDto: CreateRssSourceDto): Promise<RssSource> {
        const source = this.rssSourceRepository.create(createRssSourceDto);
        await this.rssSourceRepository.save(source);
        // 创建后立即获取文章
        //await this.fetchArticles(source);
        return source;
      }
}