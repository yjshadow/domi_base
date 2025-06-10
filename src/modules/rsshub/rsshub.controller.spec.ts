import { Test, TestingModule } from '@nestjs/testing';
import { RsshubController } from './rsshub.controller';

describe('RsshubController', () => {
  let controller: RsshubController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RsshubController],
    }).compile();

    controller = module.get<RsshubController>(RsshubController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
