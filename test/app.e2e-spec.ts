import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect(res => {
        expect(res.body).toHaveProperty('code', 200);
        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('message');
        expect(res.body).toHaveProperty('timestamp');
      });
  });

  describe('/api/rss/sources (CRUD)', () => {
    it('GET /api/rss/sources should return an array of sources', () => {
      return request(app.getHttpServer())
        .get('/api/rss/sources')
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('code', 200);
          expect(res.body.data).toBeInstanceOf(Array);
        });
    });

    it('POST /api/rss/sources should create a new source', () => {
      const newSource = {
        name: 'Test Source',
        url: 'https://example.com/feed.xml',
        language: 'en',
        target_language: 'zh',
        update_interval: 60
      };

      return request(app.getHttpServer())
        .post('/api/rss/sources')
        .send(newSource)
        .expect(201)
        .expect(res => {
          expect(res.body).toHaveProperty('code', 201);
          expect(res.body.data).toMatchObject({
            ...newSource,
            id: expect.any(Number),
            active: true,
            created_at: expect.any(String),
            updated_at: expect.any(String)
          });
        });
    });

    it('POST /api/rss/sources should validate input', () => {
      const invalidSource = {
        name: 'Test Source',
        // missing required url
        language: 'invalid-language',
        target_language: 'invalid-language'
      };

      return request(app.getHttpServer())
        .post('/api/rss/sources')
        .send(invalidSource)
        .expect(400)
        .expect(res => {
          expect(res.body).toHaveProperty('code', 400);
          expect(res.body).toHaveProperty('error');
        });
    });
  });
});