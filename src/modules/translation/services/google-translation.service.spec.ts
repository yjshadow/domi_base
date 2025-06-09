import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule, HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { GoogleTranslationService } from './google-translation.service';
import { TranslationConfigDto } from '../dto/translation-config.dto';
import { TranslationCacheService } from './translation-cache.service';

describe('GoogleTranslationService', () => {
  let service: GoogleTranslationService;
  let httpService: HttpService;
  let cacheService: TranslationCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        GoogleTranslationService,
        TranslationCacheService,
        {
          provide: 'TRANSLATION_CONFIG',
          useValue: new TranslationConfigDto()
        }
      ]
    }).compile();

    service = module.get<GoogleTranslationService>(GoogleTranslationService);
    httpService = module.get<HttpService>(HttpService);
    cacheService = module.get<TranslationCacheService>(TranslationCacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('translate', () => {
    it('should return translated text', async () => {
      const mockResponse = {
        data: {
          data: {
            translations: [{
              translatedText: '你好世界',
              detectedSourceLanguage: 'en'
            }]
          }
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {}
      };

      jest.spyOn(httpService, 'post').mockImplementation(() => of(mockResponse));

      const result = await service.translate('Hello world', 'zh');
      expect(result).toBe('你好世界');
    });

    it('should handle translation error', async () => {
      jest.spyOn(httpService, 'post').mockImplementation(() => 
        throwError(() => new Error('API error'))
      );

      const result = await service.translate('Hello world', 'zh');
      expect(result).toBe('');
    });

    it('should return cached translation when available', async () => {
      const cachedText = 'cached translation';
      jest.spyOn(cacheService, 'get').mockReturnValue(cachedText);
      
      const result = await service.translate('Hello world', 'zh');
      expect(result).toBe(cachedText);
      expect(httpService.post).not.toHaveBeenCalled();
    });

    it('should call API and cache result when no cache available', async () => {
      const apiResponse = 'translated text';
      jest.spyOn(cacheService, 'get').mockReturnValue(null);
      jest.spyOn(httpService, 'post').mockImplementation(() => 
        of({
          data: {
            data: {
              translations: [{
                translatedText: apiResponse,
                detectedSourceLanguage: 'en'
              }]
            }
          }
        })
      );
      const setSpy = jest.spyOn(cacheService, 'set');

      const result = await service.translate('Hello world', 'zh');
      expect(result).toBe(apiResponse);
      expect(setSpy).toHaveBeenCalledWith(
        'translation:zh:Hello world',
        apiResponse,
        expect.any(Number)
      );
    });
  });

  describe('translateBatch', () => {
    it('should return array of translated texts', async () => {
      const mockResponse = {
        data: {
          data: {
            translations: [{
              translatedText: '你好',
              detectedSourceLanguage: 'en'
            }, {
              translatedText: '世界',
              detectedSourceLanguage: 'en'
            }]
          }
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {}
      };

      jest.spyOn(httpService, 'post').mockImplementation(() => of(mockResponse));

      const results = await service.translateBatch(['Hi', 'World'], 'zh');
      expect(results).toEqual(['你好', '世界']);
    });

    it('should use cached translations when available', async () => {
      const cachedText1 = 'cached 你好';
      const cachedText2 = 'cached 世界';
      
      jest.spyOn(cacheService, 'get')
        .mockImplementationOnce(() => cachedText1)
        .mockImplementationOnce(() => cachedText2);
      
      const results = await service.translateBatch(['Hi', 'World'], 'zh');
      expect(results).toEqual([cachedText1, cachedText2]);
      expect(httpService.post).not.toHaveBeenCalled();
    });

    it('should handle mixed cached and uncached texts', async () => {
      const cachedText = 'cached 你好';
      const apiResponse = 'translated 世界';
      
      jest.spyOn(cacheService, 'get')
        .mockImplementationOnce(() => cachedText)
        .mockImplementationOnce(() => null);
        
      jest.spyOn(httpService, 'post').mockImplementation(() => 
        of({
          data: {
            data: {
              translations: [{
                translatedText: apiResponse,
                detectedSourceLanguage: 'en'
              }]
            }
          }
        })
      );
      const setSpy = jest.spyOn(cacheService, 'set');

      const results = await service.translateBatch(['Hi', 'World'], 'zh');
      expect(results).toEqual([cachedText, apiResponse]);
      expect(httpService.post).toHaveBeenCalledTimes(1);
      expect(setSpy).toHaveBeenCalledWith(
        'translation:zh:World',
        apiResponse,
        expect.any(Number)
      );
    });

    it('should handle empty batch request', async () => {
      const results = await service.translateBatch([], 'zh');
      expect(results).toEqual([]);
      expect(httpService.post).not.toHaveBeenCalled();
    });
  });
});