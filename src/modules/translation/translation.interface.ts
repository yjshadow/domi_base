export interface TranslationService {
  translate(text: string, targetLanguage?: string): Promise<string>;
  translateBatch(texts: string[], targetLanguage?: string): Promise<string[]>;
}