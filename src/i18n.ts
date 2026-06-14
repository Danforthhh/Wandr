import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import type { InitOptions } from 'i18next';

import enAuth from './locales/en/auth.json';
import enLanding from './locales/en/landing.json';
import enDashboard from './locales/en/dashboard.json';
import enWizard from './locales/en/wizard.json';
import enTrip from './locales/en/trip.json';
import enPacking from './locales/en/packing.json';
import enChat from './locales/en/chat.json';
import enSearch from './locales/en/search.json';

import frAuth from './locales/fr/auth.json';
import frLanding from './locales/fr/landing.json';
import frDashboard from './locales/fr/dashboard.json';
import frWizard from './locales/fr/wizard.json';
import frTrip from './locales/fr/trip.json';
import frPacking from './locales/fr/packing.json';
import frChat from './locales/fr/chat.json';
import frSearch from './locales/fr/search.json';

const options: InitOptions = {
  resources: {
      en: {
        auth: enAuth,
        landing: enLanding,
        dashboard: enDashboard,
        wizard: enWizard,
        trip: enTrip,
        packing: enPacking,
        chat: enChat,
        search: enSearch,
      },
      fr: {
        auth: frAuth,
        landing: frLanding,
        dashboard: frDashboard,
        wizard: frWizard,
        trip: frTrip,
        packing: frPacking,
        chat: frChat,
        search: frSearch,
      },
    },
    fallbackLng: 'en',
    defaultNS: 'landing',
    interpolation: {
      escapeValue: false,
    },
  detection: {
    order: ['localStorage', 'navigator'],
    lookupLocalStorage: 'wandr-lang',
    caches: ['localStorage'],
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init(options);

export default i18n;
