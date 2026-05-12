import de from './de.json';

export type LanguageCode = 'de' | 'en' | 'fr' | 'it' | 'tr' | 'sq' | 'sr' | 'es' | 'hr' | 'pt';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
}

export type TranslationDictionary = Record<string, unknown>;
type TranslationDictionaryModule = { default: TranslationDictionary };

export const DEFAULT_LANGUAGE = 'de' satisfies LanguageCode;

export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { code: 'de', label: 'German', nativeLabel: 'Deutsch' },
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'fr', label: 'French', nativeLabel: 'Français' },
  { code: 'it', label: 'Italian', nativeLabel: 'Italiano' },
  { code: 'tr', label: 'Turkish', nativeLabel: 'Türkçe' },
  { code: 'sq', label: 'Albanian', nativeLabel: 'Shqip' },
  { code: 'sr', label: 'Serbian', nativeLabel: 'Srpski' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'hr', label: 'Croatian', nativeLabel: 'Hrvatski' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português' },
] as const;

const TRANSLATION_DICTIONARY_LOADERS: Record<
  Exclude<LanguageCode, typeof DEFAULT_LANGUAGE>,
  () => Promise<TranslationDictionaryModule>
> = {
  en: () => import('./en.json') as Promise<TranslationDictionaryModule>,
  fr: () => import('./fr.json') as Promise<TranslationDictionaryModule>,
  it: () => import('./it.json') as Promise<TranslationDictionaryModule>,
  tr: () => import('./tr.json') as Promise<TranslationDictionaryModule>,
  sq: () => import('./sq.json') as Promise<TranslationDictionaryModule>,
  sr: () => import('./sr.json') as Promise<TranslationDictionaryModule>,
  es: () => import('./es.json') as Promise<TranslationDictionaryModule>,
  hr: () => import('./hr.json') as Promise<TranslationDictionaryModule>,
  pt: () => import('./pt.json') as Promise<TranslationDictionaryModule>,
};

const translationDictionaries: Partial<Record<LanguageCode, TranslationDictionary>> = {
  de: de as TranslationDictionary,
};

export function translationDictionaryFor(
  language: LanguageCode,
): TranslationDictionary | undefined {
  return translationDictionaries[language];
}

export async function loadTranslationDictionary(
  language: LanguageCode,
): Promise<TranslationDictionary> {
  const loadedDictionary = translationDictionaries[language];
  if (loadedDictionary) {
    return loadedDictionary;
  }

  if (language === DEFAULT_LANGUAGE) {
    return de;
  }

  const loader =
    TRANSLATION_DICTIONARY_LOADERS[language as Exclude<LanguageCode, typeof DEFAULT_LANGUAGE>];
  const module = await loader();
  translationDictionaries[language] = module.default;
  return module.default;
}
