import { renderHook } from '@testing-library/react';

import { useIsEditingDefaultLocale, useShouldLockNonLocalizedField } from '../useI18nFieldLock';

const mockUseQueryParams = jest.fn(() => [{ query: {} }]);
const mockUseDocumentContext = jest.fn();

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useQueryParams: () => mockUseQueryParams(),
}));

jest.mock('../useDocumentContext', () => ({
  useDocumentContext: () => mockUseDocumentContext(),
}));

describe('useI18nFieldLock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryParams.mockReturnValue([{ query: {} }]);
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

    it('returns true when defaultLocale is missing from document meta', () => {
      mockUseQueryParams.mockReturnValue([{ query: { plugins: { i18n: { locale: 'fr' } } } }]);
      mockUseDocumentContext.mockReturnValue({
        currentDocument: {
          schema: { pluginOptions: { i18n: { localized: true } } },
          document: { locale: 'fr' },
          meta: { availableLocales: [{ locale: 'en' }] },
        },
      });

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

    it('does not lock relations, uids, or dynamic zones', () => {
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
      const { result: dzResult } = renderHook(() =>
        useShouldLockNonLocalizedField({
          type: 'dynamiczone',
          pluginOptions: { i18n: { localized: false } },
        })
      );

      expect(relationResult.current).toBe(false);
      expect(uidResult.current).toBe(false);
      expect(dzResult.current).toBe(false);
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
