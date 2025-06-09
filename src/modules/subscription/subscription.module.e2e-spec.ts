import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { AppModule } from '../../app.module';
import { SubscriptionModule } from './subscription.module';
import { Subscription } from './models/subscription.entity';

describe('SubscriptionModule (e2e)', () => {
  let app: INestApplication;
  let subscriptionRepository: Repository<Subscription>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        TypeOrmModule.forFeature([Subscription]),
        SubscriptionModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    subscriptionRepository = moduleFixture.get('SubscriptionRepository');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await subscriptionRepository.clear();
  });

  describe('POST /subscriptions', () => {
    it('should create a subscription', async () => {
      const createDto = {
        name: 'Test Feed',
        url: 'http://example.com/feed',
      };

      const response = await request(app.getHttpServer())
        .post('/subscriptions')
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(createDto.name);
      expect(response.body.url).toBe(createDto.url);
    });

    it('should return 400 for invalid input', async () => {
      await request(app.getHttpServer())
        .post('/subscriptions')
        .send({})
        .expect(400);
    });
  });

  describe('GET /subscriptions', () => {
    it('should return all subscriptions', async () => {
      await subscriptionRepository.save([
        { name: 'Feed 1', url: 'http://example.com/feed1' },
        { name: 'Feed 2', url: 'http://example.com/feed2' },
      ]);

      const response = await request(app.getHttpServer())
        .get('/subscriptions')
        .expect(200);

      expect(response.body).toHaveLength(2);
    });
  });

  describe('GET /subscriptions/:id', () => {
    it('should return a single subscription', async () => {
      const subscription = await subscriptionRepository.save({
        name: 'Test Feed',
        url: 'http://example.com/feed',
      });

      const response = await request(app.getHttpServer())
        .get(`/subscriptions/${subscription.id}`)
        .expect(200);

      expect(response.body.id).toBe(subscription.id);
      expect(response.body.name).toBe(subscription.name);
    });

    it('should return 404 for non-existent subscription', async () => {
      await request(app.getHttpServer())
        .get('/subscriptions/999')
        .expect(404);
    });
  });

  describe('PUT /subscriptions/:id', () => {
    it('should update a subscription', async () => {
      const subscription = await subscriptionRepository.save({
        name: 'Old Name',
        url: 'http://example.com/old',
      });

      const updateDto = { name: 'Updated Name' };

      const response = await request(app.getHttpServer())
        .put(`/subscriptions/${subscription.id}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.name).toBe(updateDto.name);
      expect(response.body.url).toBe(subscription.url);
    });
  });

  describe('DELETE /subscriptions/:id', () => {
    it('should delete a subscription', async () => {
      const subscription = await subscriptionRepository.save({
        name: 'To Delete',
        url: 'http://example.com/delete',
      });

      await request(app.getHttpServer())
        .delete(`/subscriptions/${subscription.id}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/subscriptions/${subscription.id}`)
        .expect(404);
    });
  });
});