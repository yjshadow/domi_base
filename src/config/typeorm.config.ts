import { DataSource } from 'typeorm';
import { User } from '../modules/user/user.entity';
import { CreateRssTables1686041000000 } from '../migrations/1686041000000-CreateRssTables';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: 'root',
  database: 'domibase',
  entities: [User],
  migrations: [CreateRssTables1686041000000],
  synchronize: false,
});