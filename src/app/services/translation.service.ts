import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable, signal } from '@angular/core';

import {
  DEFAULT_LANGUAGE,
  LANGUAGE_OPTIONS,
  loadTranslationDictionary,
  translationDictionaryFor,
  type LanguageCode,
  type TranslationDictionary,
} from '../lang';

export type { LanguageCode } from '../lang';

const LANGUAGE_STORAGE_KEY = 'app-language';

type TranslationParams = Record<string, string | number | null | undefined>;
type TranslationPath = readonly string[];

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly document = inject(DOCUMENT);
  private readonly keyPathCache = new Map<string, TranslationPath>();
  private readonly translationCache = new Map<string, string>();

  readonly defaultLanguage = DEFAULT_LANGUAGE;
  readonly supportedLanguages = LANGUAGE_OPTIONS;
  readonly language = signal<LanguageCode>(this.loadInitialLanguage());
  readonly dictionaryVersion = signal(0);

  constructor() {
    effect(() => {
      const language = this.language();
      this.document.documentElement.lang = language;
      this.translationCache.clear();

      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      } catch {
        // Ignore storage write failures and keep runtime language in memory.
      }
    });

    effect(() => {
      const language = this.language();
      void this.loadLanguage(language);
    });
  }

  setLanguage(language: LanguageCode): void {
    if (!this.isLanguageCode(language)) {
      return;
    }

    this.language.set(language);
  }

  isLanguageCode(value: string | null | undefined): value is LanguageCode {
    return !!value && this.supportedLanguages.some((entry) => entry.code === value);
  }

  translate(key: string, params?: TranslationParams): string {
    const language = this.language();
    this.dictionaryVersion();
    const cacheKey = `${language}:${key}`;
    if (!params) {
      if (this.translationCache.has(cacheKey)) {
        return this.translationCache.get(cacheKey) ?? key;
      }
    }

    const current = this.lookupValue(translationDictionaryFor(language), key);
    const fallback = this.lookupValue(translationDictionaryFor(this.defaultLanguage), key);
    const text =
      typeof current === 'string' ? current : typeof fallback === 'string' ? fallback : key;

    if (!params) {
      this.translationCache.set(cacheKey, text);
      return text;
    }

    return this.interpolate(text, params);
  }

  private loadInitialLanguage(): LanguageCode {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (this.isLanguageCode(stored)) {
        return stored;
      }
    } catch {
      // Ignore storage read failures and continue with browser/default language.
    }

    const browserLanguage = this.browserLanguage();
    if (browserLanguage) {
      return browserLanguage;
    }

    return this.defaultLanguage;
  }

  private browserLanguage(): LanguageCode | null {
    const languages = globalThis.navigator?.languages?.length
      ? globalThis.navigator.languages
      : [globalThis.navigator?.language].filter((language): language is string => !!language);

    for (const language of languages) {
      const normalized = language.toLowerCase();
      const exact = normalized.split('-')[0];
      if (this.isLanguageCode(normalized)) {
        return normalized;
      }
      if (this.isLanguageCode(exact)) {
        return exact;
      }
    }

    return null;
  }

  private async loadLanguage(language: LanguageCode): Promise<void> {
    if (translationDictionaryFor(language)) {
      return;
    }

    try {
      await loadTranslationDictionary(language);
      this.translationCache.clear();
      this.dictionaryVersion.update((version) => version + 1);
    } catch {
      // Keep using fallback translations if a lazy dictionary chunk cannot load.
    }
  }

  private lookupValue(dictionary: TranslationDictionary | undefined, key: string): unknown {
    if (!dictionary) {
      return undefined;
    }

    return this.keyPath(key).reduce<unknown>((current, segment) => {
      if (current && typeof current === 'object' && segment in current) {
        return (current as Record<string, unknown>)[segment];
      }

      return undefined;
    }, dictionary);
  }

  private keyPath(key: string): TranslationPath {
    let path = this.keyPathCache.get(key);
    if (!path) {
      path = key.split('.');
      this.keyPathCache.set(key, path);
    }

    return path;
  }

  private interpolate(template: string, params?: TranslationParams): string {
    if (!params) {
      return template;
    }

    return Object.entries(params).reduce((text, [paramKey, value]) => {
      return text.replaceAll(`{{${paramKey}}}`, value == null ? '' : String(value));
    }, template);
  }
}
