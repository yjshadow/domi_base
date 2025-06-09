import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateRssTables1686041000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建 RSS 源表
    await queryRunner.createTable(
      new Table({
        name: 'rss_source',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'url',
            type: 'varchar',
            length: '1000',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'update_interval',
            type: 'int',
            default: 60, // 默认60分钟
          },
          {
            name: 'last_fetch_time',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'error_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'last_error',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'custom_selector',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // 创建 RSS 文章表
    await queryRunner.createTable(
      new Table({
        name: 'rss_article',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'source_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'content',
            type: 'longtext',
            isNullable: true,
          },
          {
            name: 'link',
            type: 'varchar',
            length: '1000',
            isNullable: false,
          },
          {
            name: 'guid',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'author',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'pub_date',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'categories',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'is_read',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_favorite',
            type: 'boolean',
            default: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // 添加外键约束
    await queryRunner.createForeignKey(
      'rss_article',
      new TableForeignKey({
        columnNames: ['source_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'rss_source',
        onDelete: 'CASCADE',
      }),
    );

    // 添加索引
    await queryRunner.query(
      'CREATE INDEX idx_rss_article_guid ON rss_article(guid)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_rss_article_pub_date ON rss_article(pub_date)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_rss_article_source_id ON rss_article(source_id)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除外键约束（会自动删除相关索引）
    const table = await queryRunner.getTable('rss_article');
    if (table) {
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('source_id') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('rss_article', foreignKey);
      }
    }

    // 删除索引
    await queryRunner.query('DROP INDEX idx_rss_article_guid ON rss_article');
    await queryRunner.query('DROP INDEX idx_rss_article_pub_date ON rss_article');
    await queryRunner.query('DROP INDEX idx_rss_article_source_id ON rss_article');

    // 删除表
    await queryRunner.dropTable('rss_article');
    await queryRunner.dropTable('rss_source');
  }
}