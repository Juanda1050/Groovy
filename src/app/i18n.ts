import i18n,{ type ReadCallback } from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import type { TranslationModule } from "@/models/translations";

const translationFiles = import.meta.glob<TranslationModule>('../locales/*/*.json')

i18n
  .use(LanguageDetector)
  .use({
    type: "backend",
    read(language: string, namespace: string, callback: ReadCallback) {
      const load = translationFiles[`../locales/${language}/${namespace}.json`];

      if (!load) {
        callback(new Error("Translation module unavailable"), false);
        return;
      }

      load()
        .then((module) => {
          callback(null, module.default);
        })
        .catch((error: unknown) => {
          callback(
            error instanceof Error ? error : new Error(String(error)),
            false,
          );
        });
    },
  })
  .use(initReactI18next);

export const i18nReady = i18n.init({
  supportedLngs: ["en", "es"],
  fallbackLng: "en",
  load: "languageOnly",
  ns: ["common"],
  defaultNS: "common",
  interpolation: {
    escapeValue: false,
  },
  detection: {
    order: ["localStorage", "navigator"],
    lookupLocalStorage: "groovyLanguage",
    caches: ["localStorage"],
  },
});

export default i18n;
