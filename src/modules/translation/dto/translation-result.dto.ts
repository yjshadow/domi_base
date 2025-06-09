export class TranslationResultDto {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence?: number; // 翻译置信度
  error?: string; // 错误信息
}