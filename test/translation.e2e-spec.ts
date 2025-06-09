import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TranslateDto, BatchTranslateDto } from '../src/modules/translation/dto/translate.dto';

describe('TranslationController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // 应用全局管道，确保 DTO 验证正常工作
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/translation/translate (POST)', () => {
    it('should translate text successfully', () => {
      const translateDto: TranslateDto = {
        text: 'Hello, world!',
        sourceLanguage: 'en',
        targetLanguage: 'zh',
      };

      return request(app.getHttpServer())
        .post('/api/translation/translate')
        .send(translateDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('translatedText');
          expect(res.body).toHaveProperty('detectedSourceLanguage');
          expect(typeof res.body.translatedText).toBe('string');
        });
    });

    it('should handle empty text', () => {
      const translateDto: TranslateDto = {
        text: '',
        targetLanguage: 'zh',
      };

      return request(app.getHttpServer())
        .post('/api/translation/translate')
        .send(translateDto)
        .expect(400); // 应该返回验证错误
    });

    it('should handle missing target language', () => {
      const translateDto = {
        text: 'Hello, world!',
      };

      return request(app.getHttpServer())
        .post('/api/translation/translate')
        .send(translateDto)
        .expect(400); // 应该返回验证错误
    });
  });

  describe('/api/translation/translate/batch (POST)', () => {
    it('should translate multiple texts successfully', () => {
      const batchTranslateDto: BatchTranslateDto = {
        texts: ['Hello', 'World'],
        sourceLanguage: 'en',
        targetLanguage: 'zh',
      };

      return request(app.getHttpServer())
        .post('/api/translation/translate/batch')
        .send(batchTranslateDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('translations');
          expect(Array.isArray(res.body.translations)).toBe(true);
          expect(res.body.translations.length).toBe(2);
          res.body.translations.forEach((translation) => {
            expect(translation).toHaveProperty('translatedText');
            expect(translation).toHaveProperty('detectedSourceLanguage');
          });
        });
    });

    it('should handle empty texts array', () => {
      const batchTranslateDto: BatchTranslateDto = {
        texts: [],
        targetLanguage: 'zh',
      };

      return request(app.getHttpServer())
        .post('/api/translation/translate/batch')
        .send(batchTranslateDto)
        .expect(400); // 应该返回验证错误
    });
  });

  describe('/api/translation/detect (POST)', () => {
    it('should detect language successfully', () => {
      return request(app.getHttpServer())
        .post('/api/translation/detect')
        .send({ text: 'Hello, world!' })
        .expect(201)
        .expect((res) => {
          expect(typeof res.body).toBe('string');
          expect(res.body).toBe('en'); // 使用模拟服务时，英文文本应该返回 'en'
        });
    });

    it('should handle empty text', () => {
      return request(app.getHttpServer())
        .post('/api/translation/detect')
        .send({ text: '' })
        .expect(400); // 应该返回验证错误
    });
  });

  describe('/api/translation/languages (GET)', () => {
    it('should return supported languages', () => {
      return request(app.getHttpServer())
        .get('/api/translation/languages')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body).toContain('en');
          expect(res.body).toContain('zh');
        });
    });
  });

  describe('/api/translation/health (GET)', () => {
    it('should return translation service health status', () => {
      return request(app.getHttpServer())
        .get('/api/translation/health')
        .expect(200)
        .expect((res) => {
          expect(typeof res.body).toBe('boolean');
        });
    });
  });
});