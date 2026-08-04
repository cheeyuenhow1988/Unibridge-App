import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/i18n/en.json';
import ms from '@/i18n/ms.json';
import id from '@/i18n/id.json';
import vi from '@/i18n/vi.json';
import zh from '@/i18n/zh.json';
import zhTW from '@/i18n/zh-TW.json';

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ms: { translation: ms },
    id: { translation: id },
    vi: { translation: vi },
    zh: { translation: zh },
    'zh-TW': { translation: zhTW },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
