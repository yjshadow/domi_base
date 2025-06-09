import { DataSource } from 'typeorm';
import { User } from '../modules/user/user.entity';
import { RssSource } from '../modules/rss/entities/rss-source.entity';
import { RssArticle } from '../modules/rss/entities/rss-article.entity';
import { CreateRssTables1686041000000 } from '../migrations/1686041000000-CreateRssTables';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: 'root',
  database: 'domibase',
  entities: [User, RssSource, RssArticle],
  migrations: [CreateRssTables1686041000000],
  synchronize: false,
});