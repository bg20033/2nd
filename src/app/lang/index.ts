import de from './de.json';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import hr from './hr.json';
import it from './it.json';
import pt from './pt.json';
import sq from './sq.json';
import sr from './sr.json';
import tr from './tr.json';

export type LanguageCode = 'de' | 'en' | 'fr' | 'it' | 'tr' | 'sq' | 'sr' | 'es' | 'hr' | 'pt';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
}

export type TranslationDictionary = typeof de;

export const DEFAULT_LANGUAGE: LanguageCode = 'de';

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

export const TRANSLATION_DICTIONARIES: Readonly<Record<LanguageCode, TranslationDictionary>> = {
  de,
  en: en as TranslationDictionary,
  fr: fr as TranslationDictionary,
  it: it as TranslationDictionary,
  tr: tr as TranslationDictionary,
  sq: sq as TranslationDictionary,
  sr: sr as TranslationDictionary,
  es: es as TranslationDictionary,
  hr: hr as TranslationDictionary,
  pt: pt as TranslationDictionary,
};
