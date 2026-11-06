import { renderHook } from '@testing-library/react';

import {
  useIsEditingDefaultLocale,
  useOmitLockedSharedFieldsOnLocaleCreate,
  useShouldLockNonLocalizedField,
} from '../useI18nFieldLock';

type I18nLocalesQueryResult = {
  data: Array<{ code: string; isDefault: boolean }> | undefined;
};

const mockUseQueryParams = jest.fn(() => [{ query: {} }]);
const mockUseDocumentContext = jest.fn();
const mockUseGetI18nLocalesQuery = jest.fn((): I18nLocalesQueryResult => ({ data: undefined }));
const mockUseI18nSharedFieldsLock = jest.fn(
  (_name: string, selector: (state: { isUnlocked: boolean }) => unknown) =>
    selector({ isUnlocked: false })
);

const mockFormState: { values: Record<string, unknown>; initialValues: Record<string, unknown> } = {
  values: {},
  initialValues: {},
};

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useQueryParams: () => mockUseQueryParams(),
  useForm: (_name: string, selector: (state: typeof mockFormState) => unknown) =>
    selector(mockFormState),
}));

jest.mock('../useDocumentContext', () => ({
  useDocumentContext: () => mockUseDocumentContext(),
}));

jest.mock('../../services/documents', () => ({
  useGetI18nLocalesQuery: () => mockUseGetI18nLocalesQuery(),
}));

jest.mock('../../features/I18nSharedFieldsLock', () => ({
  useI18nSharedFieldsLock: (name: string, selector: (state: { isUnlocked: boolean }) => unknown) =>
    mockUseI18nSharedFieldsLock(name, selector),
}));

describe('useI18nFieldLock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryParams.mockReturnValue([{ query: {} }]);
    mockUseGetI18nLocalesQuery.mockReturnValue({ data: undefined });
    mockUseI18nSharedFieldsLock.mockImplementation((_name, selector) =>
      selector({ isUnlocked: false })
    );
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

    it('does not lock shared fields on create when there is no default-locale entry', () => {
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

      expect(result.current).toBe(false);
    });

    it('does not lock shared fields when the document exists only in the secondary locale', () => {
      mockUseQueryParams.mockReturnValue([{ query: { plugins: { i18n: { locale: 'fr' } } } }]);
      mockUseDocumentContext.mockReturnValue({
        currentDocument: {
          schema: { pluginOptions: { i18n: { localized: true } } },
          document: { locale: 'fr' },
          meta: { availableLocales: [], defaultLocale: 'en' },
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

    it('locks when meta omits defaultLocale but availableLocales contains the locales-list default', () => {
      mockUseQueryParams.mockReturnValue([{ query: { plugins: { i18n: { locale: 'fr' } } } }]);
      mockUseDocumentContext.mockReturnValue({
        currentDocument: {
          schema: { pluginOptions: { i18n: { localized: true } } },
          document: { locale: 'fr' },
          meta: { availableLocales: [{ locale: 'en' }] },
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
          type: 'string',
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

    it('does not lock shared fields after the editor accepts the unlock warning', () => {
      mockUseQueryParams.mockReturnValue([{ query: { plugins: { i18n: { locale: 'fr' } } } }]);
      mockUseDocumentContext.mockReturnValue({
        currentDocument: {
          schema: { pluginOptions: { i18n: { localized: true } } },
          document: { locale: 'fr' },
          meta: { availableLocales: [{ locale: 'en' }], defaultLocale: 'en' },
        },
      });
      mockUseI18nSharedFieldsLock.mockImplementation((_name, selector) =>
        selector({ isUnlocked: true })
      );

      const { result } = renderHook(() =>
        useShouldLockNonLocalizedField({
          type: 'boolean',
          pluginOptions: { i18n: { localized: false } },
        })
      );

      expect(result.current).toBe(false);
    });

    it('does not lock when neither metadata nor the locales list names a default locale', () => {
      mockUseQueryParams.mockReturnValue([{ query: { plugins: { i18n: { locale: 'fr' } } } }]);
      mockUseDocumentContext.mockReturnValue({
        currentDocument: {
          schema: { pluginOptions: { i18n: { localized: true } } },
          document: { locale: 'fr' },
          meta: { availableLocales: [] },
        },
      });
      mockUseGetI18nLocalesQuery.mockReturnValue({
        data: [{ code: 'fr', isDefault: false }],
      });

      const { result } = renderHook(() =>
        useShouldLockNonLocalizedField({
          type: 'string',
          pluginOptions: { i18n: { localized: false } },
        })
      );

      expect(result.current).toBe(false);
    });

    it('does not lock when availableLocales is missing', () => {
      mockUseQueryParams.mockReturnValue([{ query: { plugins: { i18n: { locale: 'fr' } } } }]);
      mockUseDocumentContext.mockReturnValue({
        currentDocument: {
          schema: { pluginOptions: { i18n: { localized: true } } },
          document: { locale: 'fr' },
          meta: { defaultLocale: 'en' },
        },
      });

      const { result } = renderHook(() =>
        useShouldLockNonLocalizedField({
          type: 'string',
          pluginOptions: { i18n: { localized: false } },
        })
      );

      expect(result.current).toBe(false);
    });
  });

  describe('useOmitLockedSharedFieldsOnLocaleCreate', () => {
    const attributes = {
      title: { type: 'string', pluginOptions: { i18n: { localized: true } } },
      shared: { type: 'component', pluginOptions: { i18n: { localized: false } } },
      blocks: { type: 'dynamiczone' },
      slug: { type: 'uid' },
    };
    const payload = {
      title: 'Bonjour',
      shared: { name: 'kept on the server', tag: { connect: [], disconnect: [] } },
      blocks: [],
      slug: 'bonjour',
    };

    const mockSecondaryLocale = (document: { id?: number; locale: string } | undefined) => {
      mockUseQueryParams.mockReturnValue([{ query: { plugins: { i18n: { locale: 'fr' } } } }]);
      mockUseDocumentContext.mockReturnValue({
        currentDocument: {
          schema: { pluginOptions: { i18n: { localized: true } }, attributes },
          document,
          meta: { availableLocales: [{ locale: 'en' }], defaultLocale: 'en' },
        },
      });
    };

    it('drops locked shared fields when the save creates a missing locale', () => {
      mockSecondaryLocale(undefined);

      const { result } = renderHook(() => useOmitLockedSharedFieldsOnLocaleCreate());

      expect(result.current(payload)).toEqual({ title: 'Bonjour', slug: 'bonjour' });
    });

    it('keeps the payload when the locale already exists', () => {
      mockSecondaryLocale({ id: 4, locale: 'fr' });

      const { result } = renderHook(() => useOmitLockedSharedFieldsOnLocaleCreate());

      expect(result.current(payload)).toBe(payload);
    });

    it('keeps the payload when the document has no default-locale entry', () => {
      mockUseQueryParams.mockReturnValue([{ query: { plugins: { i18n: { locale: 'fr' } } } }]);
      mockUseDocumentContext.mockReturnValue({
        currentDocument: {
          schema: { pluginOptions: { i18n: { localized: true } }, attributes },
          document: undefined,
          meta: { availableLocales: [{ locale: 'es' }], defaultLocale: 'en' },
        },
      });

      const { result } = renderHook(() => useOmitLockedSharedFieldsOnLocaleCreate());

      expect(result.current(payload)).toBe(payload);
    });

    it('keeps only the shared fields the editor changed after unlocking', () => {
      mockSecondaryLocale(undefined);
      mockUseI18nSharedFieldsLock.mockImplementation((_name, selector) =>
        selector({ isUnlocked: true })
      );
      mockFormState.initialValues = { shared: { name: 'inherited' }, blocks: [] };
      mockFormState.values = { shared: { name: 'inherited' }, blocks: [{ name: 'added' }] };

      const { result } = renderHook(() => useOmitLockedSharedFieldsOnLocaleCreate());

      expect(result.current(payload)).toEqual({ title: 'Bonjour', blocks: [], slug: 'bonjour' });

      mockFormState.initialValues = {};
      mockFormState.values = {};
    });
  });
});
