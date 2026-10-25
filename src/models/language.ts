import type { SupportedLanguage } from "@/models/preferences";

export type LanguageSaveState =
  | 'idle'
  | 'saving'
  | 'savedAccount'
  | 'savedDevice'
  | 'error'

export interface LanguageOption {
  value: SupportedLanguage
  label: string
}

export interface LanguageSelectorProps {
  value: SupportedLanguage
  options: readonly LanguageOption[]
  label: string
  disabled: boolean
  onChange: (language: SupportedLanguage) => Promise<void>
}

export interface UpdateLanguageInput {
  userId: string
  locale: SupportedLanguage
}