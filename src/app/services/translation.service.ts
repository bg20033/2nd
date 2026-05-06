import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable, signal } from '@angular/core';

import {
  DEFAULT_LANGUAGE,
  LANGUAGE_OPTIONS,
  LanguageCode,
  TRANSLATION_DICTIONARIES,
  TranslationDictionary,
} from '../lang';

export type { LanguageCode } from '../lang';

const LANGUAGE_STORAGE_KEY = 'app-language';

type TranslationParams = Record<string, string | number | null | undefined>;
type TranslationPath = readonly string[];

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly document = inject(DOCUMENT);
  private readonly keyPathCache = new Map<string, TranslationPath>();

  readonly defaultLanguage = DEFAULT_LANGUAGE;
  readonly supportedLanguages = LANGUAGE_OPTIONS;
  readonly language = signal<LanguageCode>(this.loadInitialLanguage());

  private readonly persistLanguageEffect = effect(() => {
    const language = this.language();
    this.document.documentElement.lang = language;

    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Ignore storage write failures and keep runtime language in memory.
    }
  });

  setLanguage(language: LanguageCode): void {
    if (!(language in TRANSLATION_DICTIONARIES)) {
      return;
    }

    this.language.set(language);
  }

  isLanguageCode(value: string | null | undefined): value is LanguageCode {
    return !!value && this.supportedLanguages.some((entry) => entry.code === value);
  }

  languageLabel(language: LanguageCode): string {
    const option = this.supportedLanguages.find((entry) => entry.code === language);
    return option?.nativeLabel ?? language.toUpperCase();
  }

  translate(key: string, params?: TranslationParams): string {
    this.language();

    const current = this.lookupValue(TRANSLATION_DICTIONARIES[this.language()], key);
    const fallback = this.lookupValue(TRANSLATION_DICTIONARIES[this.defaultLanguage], key);
    const text = typeof current === 'string' ? current : typeof fallback === 'string' ? fallback : key;

    return this.interpolate(text, params);
  }

  private loadInitialLanguage(): LanguageCode {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (this.isLanguageCode(stored)) {
        return stored;
      }
    } catch {
      // Ignore storage read failures and fall back to the default language.
    }

    return this.defaultLanguage;
  }

  private lookupValue(dictionary: TranslationDictionary, key: string): unknown {
    return this.keyPath(key).reduce<unknown>((current, segment) => {
      if (current && typeof current === 'object' && segment in current) {
        return (current as Record<string, unknown>)[segment];
      }

      return undefined;
    }, dictionary);
  }

  private keyPath(key: string): TranslationPath {
    const cached = this.keyPathCache.get(key);
    if (cached) {
      return cached;
    }

    const path = key.split('.');
    this.keyPathCache.set(key, path);
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
