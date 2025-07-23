// frontend/src/services/googleTranslate.js
import apiClient from '../api/index.js';
import { SUPPORTED_LANGUAGES, TRANSLATION_SERVICE_MAPPING } from '../shared/constants/languages.js';

/**
 * Google Translate Service (simplified version)
 * Integrated with backend translation_service.py
 * Optimized for real-time translation system
 */
class GoogleTranslateService {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 500; // Reduced cache size
    this.requestQueue = new Map(); // Prevent duplicate requests
  }

  /**
   * Single text translation
   */
  async translateText(text, targetLanguage, sourceLanguage = 'ko') {
    // Input validation
    if (!text || !text.trim()) return '';
    if (sourceLanguage === targetLanguage) return text;
    if (!SUPPORTED_LANGUAGES[targetLanguage]) {
      throw new Error(`Unsupported language: ${targetLanguage}`);
    }

    // Check cache
    const cacheKey = `${sourceLanguage}-${targetLanguage}-${text.trim()}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Prevent duplicate requests
    if (this.requestQueue.has(cacheKey)) {
      return this.requestQueue.get(cacheKey);
    }

    // Translation request
    const translatePromise = this._performTranslation(text, targetLanguage, sourceLanguage);
    this.requestQueue.set(cacheKey, translatePromise);

    try {
      const result = await translatePromise;
      this._manageCache(cacheKey, result);
      return result;
    } catch (error) {
      throw error;
    } finally {
      this.requestQueue.delete(cacheKey);
    }
  }

  /**
   * Batch translation for multiple texts
   */
  async translateMultiple(texts, targetLanguage, sourceLanguage = 'ko') {
    if (!texts || texts.length === 0) return [];
    if (sourceLanguage === targetLanguage) return texts;

    // Separate cached items and items needing translation
    const results = new Array(texts.length);
    const needTranslation = [];
    const indexMap = new Map();

    texts.forEach((text, index) => {
      if (!text || !text.trim()) {
        results[index] = text;
        return;
      }

      const cacheKey = `${sourceLanguage}-${targetLanguage}-${text.trim()}`;
      if (this.cache.has(cacheKey)) {
        results[index] = this.cache.get(cacheKey);
      } else {
        needTranslation.push(text.trim());
        indexMap.set(text.trim(), index);
      }
    });

    // If there are texts needing translation
    if (needTranslation.length > 0) {
      try {
        const response = await apiClient.post('/common/translate-batch', {
          texts: needTranslation,
          source: TRANSLATION_SERVICE_MAPPING.google[sourceLanguage] || sourceLanguage,
          target: TRANSLATION_SERVICE_MAPPING.google[targetLanguage] || targetLanguage,
          type: 'basic'
        });

        const translatedTexts = response.data.data.translatedTexts;

        needTranslation.forEach((originalText, i) => {
          const translatedText = translatedTexts[i] || originalText;
          const originalIndex = indexMap.get(originalText);
          results[originalIndex] = translatedText;

          // Save to cache
          const cacheKey = `${sourceLanguage}-${targetLanguage}-${originalText}`;
          this._manageCache(cacheKey, translatedText);
        });
      } catch (error) {
        console.error('Batch translation error:', error);
        
        // Fill failed items with original text
        needTranslation.forEach((originalText) => {
          const originalIndex = indexMap.get(originalText);
          if (results[originalIndex] === undefined) {
            results[originalIndex] = originalText;
          }
        });
      }
    }

    return results;
  }

  /**
   * UI elements translation
   */
  async translateUI(uiTexts, targetLanguage) {
    if (!uiTexts || typeof uiTexts !== 'object') {
      return uiTexts;
    }

    try {
      const response = await apiClient.post('/common/translate-ui', {
        elements: uiTexts,
        target_language: TRANSLATION_SERVICE_MAPPING.google[targetLanguage] || targetLanguage
      });

      console.log('Backend /translate-ui response:', response);
      console.log('Response data:', response.data);

      // Safely access
      const translatedElements = response?.data?.data?.translated_elements;
      if (!translatedElements) {
        console.warn('translated_elements field not found in response!');
        return uiTexts;
      }
      return translatedElements;
    } catch (error) {
      console.error('UI translation error:', error);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
      }
      return uiTexts;
    }
  }

  /**
   * Language detection
   */
  async detectLanguage(text) {
    if (!text || text.trim().length === 0) {
      return 'ko'; // Default
    }

    // Assume short texts are Korean
    if (text.trim().length < 3) {
      return 'ko';
    }

    try {
      const response = await apiClient.post('/common/detect-language', {
        text: text.trim()
      });

      const detected = response.data.data.detectedLanguage;
      
      // If unsupported language, default to Korean
      return SUPPORTED_LANGUAGES[detected] ? detected : 'ko';
    } catch (error) {
      console.error('Language detection error:', error);
      return 'ko'; // Return default
    }
  }

  /**
   * Actual translation (private)
   */
  async _performTranslation(text, targetLanguage, sourceLanguage) {
    const response = await apiClient.post('/common/translate', {
      text: text.trim(),
      source_language: TRANSLATION_SERVICE_MAPPING.google[sourceLanguage] || sourceLanguage,
      target_language: TRANSLATION_SERVICE_MAPPING.google[targetLanguage] || targetLanguage,
      type: 'basic'
    });

    return response.data.data.translatedText;
  }

  /**
   * Cache management (private)
   */
  _manageCache(key, value) {
    // Cache size limit
    if (this.cache.size >= this.maxCacheSize) {
      // Delete oldest item (FIFO)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, value);
  }

  /**
   * Get supported languages list
   */
  getSupportedLanguages() {
    return { ...SUPPORTED_LANGUAGES };
  }

  /**
   * Cache management methods
   */
  clearCache() {
    this.cache.clear();
    this.requestQueue.clear();
  }

  getCacheSize() {
    return this.cache.size;
  }

  getQueueSize() {
    return this.requestQueue.size;
  }

  /**
   * Cache status info
   */
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      maxCacheSize: this.maxCacheSize,
      queueSize: this.requestQueue.size,
      cacheUsage: Math.round((this.cache.size / this.maxCacheSize) * 100)
    };
  }

  /**
   * Count cached translations for specific language pair
   */
  getCachedTranslationCount(sourceLanguage, targetLanguage) {
    const prefix = `${sourceLanguage}-${targetLanguage}-`;
    let count = 0;
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * Preload cache (pre-translate frequently used texts)
   */
  async preloadCommonTranslations(commonTexts, targetLanguages) {
    const promises = [];
    
    for (const targetLanguage of targetLanguages) {
      for (const text of commonTexts) {
        promises.push(
          this.translateText(text, targetLanguage, 'ko').catch(error => {
            console.warn(`Preload translation failed (${text} -> ${targetLanguage}):`, error);
          })
        );
      }
    }
    
    await Promise.allSettled(promises);
  }
}

// Singleton instance
const googleTranslateService = new GoogleTranslateService();

export default googleTranslateService;
