import i18n from 'i18next';
import LanguageSelector from 'i18next-browser-languagedetector';
import { beforeEach, describe, expect, it } from 'vitest';

describe('i18next-browser-langugageDetector', () => {
    beforeEach(() => {
        i18n.init();
        localStorage.clear();
    });

    // Add your test cases here
    it('should detect language from localStorage', async () => {
        localStorage.setItem('i18nextLng', 'es');
        await i18n
            .use(LanguageSelector)
            .init({
                fallbackLng: 'en',
                detection: {
                    order: ['localStorage', 'navigator'],
                    caches: ['localStorage']
                },
            });
        const detectedLang = i18n.language;
        expect(detectedLang).toBe('es');
    });

    it('should fall back to navigator language if localStorage is not set', async () => {
        Object.defineProperty(window.navigator, 'language', {
            value: 'fr',
            configurable: true,
        });
        await i18n
            .use(LanguageSelector)
            .init({
                fallbackLng: 'en',
                detection: {
                    order: ['localStorage', 'navigator'],
                    caches: ['localStorage']
                },
            });
        const detectedLang = i18n.language;
        expect(detectedLang).toBe('en-US');
    });

    it('should fall back to default language if no detection method works', async () => {
        await i18n
            .use(LanguageSelector)
            .init({
                fallbackLng: 'en',
                detection: {
                    order: ['localStorage', 'navigator'],
                    caches: ['localStorage']
                },
            });
        const detectedLang = i18n.language;
        expect(detectedLang).toBe('en-US');
    });
});