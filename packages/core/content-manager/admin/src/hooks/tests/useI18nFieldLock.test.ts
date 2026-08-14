import { renderHook } from '@testing-library/react';

import { useIsEditingDefaultLocale, useShouldLockNonLocalizedField } from '../useI18nFieldLock';

const mockUseQueryParams = jest.fn(() => [{ query: {} }]);
const mockUseDocumentContext = jest.fn();
const mockUseGetI18nLocalesQuery = jest.fn(() => ({ data: undefined }));

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useQueryParams: () => mockUseQueryParams(),
}));

jest.mock('../useDocumentContext', () => ({
  useDocumentContext: () => mockUseDocumentContext(),
}));

jest.mock('../../services/documents', () => ({
  useGetI18nLocalesQuery: (...args: unknown[]) => mockUseGetI18nLocalesQuery(...args),
}));

describe('useI18nFieldLock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryParams.mockReturnValue([{ query: {} }]);
    mockUseGetI18nLocalesQuery.mockReturnValue({ data: undefined });
    mockUseDocumentContext.mockReturnValue({
      currentDocument: {
        schema: { pluginOptions: { i18n: { localized: true } } },
        document: { locale: 'en' },
        meta: { availableLocales: [{ locale: 'es' }], defaultLocale: 'en' },
      },
    });
  });

  describe('useIsEditingDefaultLocale', () => {
    it('returns true when the content type is not localized', () => {
      mockUseDocumentContext.mockReturnValue({
        currentDocument: {
          schema: { pluginOptions: {} },
          document: {},
          meta: {},
        },
      });

      const { result } = renderHook(() => useIsEditingDefaultLocale());
      expect(result.current).toBe(true);
    });

    it('returns true when editing the default locale even if it is absent from availableLocales', () => {
      // availableLocales excludes the current locale — when viewing `en` (default),
      // the list only contains siblings. Lock must still treat `en` as default.
      mockUseQueryParams.mockReturnValue([{ query: { plugins: { i18n: { locale: 'en' } } } }]);
      mockUseDocumentContext.mockReturnValue({
        currentDocument: {
          schema: { pluginOptions: { i18n: { localized: true } } },
          document: { locale: 'en' },
          meta: { availableLocales: [{ locale: 'es' }], defaultLocale: 'en' },
        },
      });

      const { result } = renderHook(() => useIsEditingDefaultLocale());
      expect(result.current).toBe(true);
    });

    it('returns false when the active locale is not the default', () => {
      mockUseQueryParams.mockReturnValue([{ query: { plugins: { i18n: { locale: 'fr' } } } }]);
      mockUseDocumentContext.mockReturnValue({
        currentDocument: {
          schema: { pluginOptions: { i18n: { localized: true } } },
          document: { locale: 'fr' },
          meta: { availableLocales: [{ locale: 'en' }], defaultLocale: 'en' },
        },
      });

      const { result } = renderHook(() => useIsEditingDefaultLocale());
      expect(result.current).toBe(false);
    });

    it('falls back to the locales list when defaultLocale is missing from document meta', () => {
      mockUseQueryParams.mockReturnValue([{ query: { plugins: { i18n: { locale: 'fr' } } } }]);
      mockUseDocumentContext.mockReturnValue({
        currentDocument: {
          schema: { pluginOptions: { i18n: { localized: true } } },
          document: {},
          meta: { availableLocales: [] },
        },
      });
      mockUseGetI18nLocalesQuery.mockReturnValue({
        data: [
          { code: 'en', isDefault: true },
          { code: 'fr', isDefault: false },
        ],
      });

      const { result } = renderHook(() => useIsEditingDefaultLocale());
      expect(result.current).toBe(false);
    });

    it('returns true when defaultLocale cannot be determined from meta or locales', () => {
      mockUseQueryParams.mockReturnValue([{ query: { plugins: { i18n: { locale: 'fr' } } } }]);
      mockUseDocumentContext.mockReturnValue({
        currentDocument: {
          schema: { pluginOptions: { i18n: { localized: true } } },
          document: { locale: 'fr' },
          meta: { availableLocales: [{ locale: 'en' }] },
        },
      });
      mockUseGetI18nLocalesQuery.mockReturnValue({ data: undefined });

      const { result } = renderHook(() => useIsEditingDefaultLocale());
      expect(result.current).toBe(true);
    });
  });

  describe('useShouldLockNonLocalizedField', () => {
    it('locks a non-localized root field on a secondary locale', () => {
      mockUseQueryParams.mockReturnValue([{ query: { plugins: { i18n: { locale: 'fr' } } } }]);
      mockUseDocumentContext.mockReturnValue({
        currentDocument: {
          schema: { pluginOptions: { i18n: { localized: true } } },
          document: { locale: 'fr' },
          meta: { availableLocales: [{ locale: 'en' }], defaultLocale: 'en' },
        },
      });

      const { result } = renderHook(() =>
        useShouldLockNonLocalizedField({
          type: 'component',
          pluginOptions: { i18n: { localized: false } },
        })
      );

      expect(result.current).toBe(true);
    });

    it('does not lock non-localized fields on the default locale', () => {
      mockUseQueryParams.mockReturnValue([{ query: { plugins: { i18n: { locale: 'en' } } } }]);
      mockUseDocumentContext.mockReturnValue({
        currentDocument: {
          schema: { pluginOptions: { i18n: { localized: true } } },
          document: { locale: 'en' },
          // Sibling-only list — regresses if we incorrectly use availableLocales[0]
          meta: { availableLocales: [{ locale: 'es' }], defaultLocale: 'en' },
        },
      });

      const { result } = renderHook(() =>
        useShouldLockNonLocalizedField({
          type: 'boolean',
          pluginOptions: { i18n: { localized: false } },
        })
      );

      expect(result.current).toBe(false);
    });

    it('does not lock localized fields', () => {
      mockUseQueryParams.mockReturnValue([{ query: { plugins: { i18n: { locale: 'fr' } } } }]);
      mockUseDocumentContext.mockReturnValue({
        currentDocument: {
          schema: { pluginOptions: { i18n: { localized: true } } },
          document: { locale: 'fr' },
          meta: { availableLocales: [{ locale: 'en' }], defaultLocale: 'en' },
        },
      });

      const { result } = renderHook(() =>
        useShouldLockNonLocalizedField({
          type: 'string',
          pluginOptions: { i18n: { localized: true } },
        })
      );

      expect(result.current).toBe(false);
    });

    it('does not lock nested component fields (parent handles disable)', () => {
      mockUseQueryParams.mockReturnValue([{ query: { plugins: { i18n: { locale: 'fr' } } } }]);
      mockUseDocumentContext.mockReturnValue({
        currentDocument: {
          schema: { pluginOptions: { i18n: { localized: true } } },
          document: { locale: 'fr' },
          meta: { availableLocales: [{ locale: 'en' }], defaultLocale: 'en' },
        },
      });

      const { result } = renderHook(() =>
        useShouldLockNonLocalizedField(
          { type: 'string', pluginOptions: { i18n: { localized: false } } },
          { isInsideComponent: true }
        )
      );

      expect(result.current).toBe(false);
    });

    it('does not lock relations or uids', () => {
      mockUseQueryParams.mockReturnValue([{ query: { plugins: { i18n: { locale: 'fr' } } } }]);
      mockUseDocumentContext.mockReturnValue({
        currentDocument: {
          schema: { pluginOptions: { i18n: { localized: true } } },
          document: { locale: 'fr' },
          meta: { availableLocales: [{ locale: 'en' }], defaultLocale: 'en' },
        },
      });

      const { result: relationResult } = renderHook(() =>
        useShouldLockNonLocalizedField({ type: 'relation' })
      );
      const { result: uidResult } = renderHook(() =>
        useShouldLockNonLocalizedField({ type: 'uid' })
      );

      expect(relationResult.current).toBe(false);
      expect(uidResult.current).toBe(false);
    });

    it('locks non-localized dynamic zones on a secondary locale', () => {
      mockUseQueryParams.mockReturnValue([{ query: { plugins: { i18n: { locale: 'fr' } } } }]);
      mockUseDocumentContext.mockReturnValue({
        currentDocument: {
          schema: { pluginOptions: { i18n: { localized: true } } },
          document: { locale: 'fr' },
          meta: { availableLocales: [{ locale: 'en' }], defaultLocale: 'en' },
        },
      });

      const { result } = renderHook(() =>
        useShouldLockNonLocalizedField({
          type: 'dynamiczone',
          pluginOptions: { i18n: { localized: false } },
        })
      );

      expect(result.current).toBe(true);
    });

    it('locks shared fields on create when meta.defaultLocale is missing but locales list is known', () => {
      mockUseQueryParams.mockReturnValue([{ query: { plugins: { i18n: { locale: 'fr' } } } }]);
      mockUseDocumentContext.mockReturnValue({
        currentDocument: {
          schema: { pluginOptions: { i18n: { localized: true } } },
          document: {},
          meta: undefined,
        },
      });
      mockUseGetI18nLocalesQuery.mockReturnValue({
        data: [
          { code: 'en', isDefault: true },
          { code: 'fr', isDefault: false },
        ],
      });

      const { result } = renderHook(() =>
        useShouldLockNonLocalizedField({
          type: 'boolean',
          pluginOptions: { i18n: { localized: false } },
        })
      );

      expect(result.current).toBe(true);
    });

    it('does not lock when the attribute is undefined', () => {
      mockUseQueryParams.mockReturnValue([{ query: { plugins: { i18n: { locale: 'fr' } } } }]);
      mockUseDocumentContext.mockReturnValue({
        currentDocument: {
          schema: { pluginOptions: { i18n: { localized: true } } },
          document: { locale: 'fr' },
          meta: { availableLocales: [{ locale: 'en' }], defaultLocale: 'en' },
        },
      });

      const { result } = renderHook(() => useShouldLockNonLocalizedField(undefined));
      expect(result.current).toBe(false);
    });
  });
});
