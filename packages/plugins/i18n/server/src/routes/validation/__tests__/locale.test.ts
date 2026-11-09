import type { Core } from '@strapi/types';
import { I18nLocaleRouteValidator } from '../locale';

describe('I18nLocaleRouteValidator', () => {
  const validator = new I18nLocaleRouteValidator({} as Core.Strapi);

  // Shape returned by GET /api/i18n/locales, documentId generated with cuid2
  const locale = {
    id: 1,
    documentId: 'vq8zsdl0ldpi7an3a0pdipbf',
    name: 'English (en)',
    code: 'en',
    createdAt: '2026-10-26T10:00:00.000Z',
    updatedAt: '2026-10-26T10:00:00.000Z',
    publishedAt: '2026-10-26T10:00:00.000Z',
    isDefault: true,
  };

  test('accepts a cuid2 documentId', () => {
    expect(validator.locale.safeParse(locale).success).toBe(true);
  });

  test.each(['en', 'en-US', 'zh-Hans-HK', 'es-419'])('accepts locale code %s', (code) => {
    expect(validator.locale.safeParse({ ...locale, code }).success).toBe(true);
  });

  test('accepts a list of locales', () => {
    const locales = [locale, { ...locale, id: 2, code: 'fr-FR', isDefault: false }];

    expect(validator.locales.safeParse(locales).success).toBe(true);
  });
});
