import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/i18n/en.json';
import ms from '@/i18n/ms.json';
import zh from '@/i18n/zh.json';

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ms: { translation: ms },
    zh: { translation: zh },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
