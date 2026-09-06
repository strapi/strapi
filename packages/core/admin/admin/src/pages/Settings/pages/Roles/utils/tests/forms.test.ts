import { createDefaultCTForm } from '../forms';

import type {
  SubjectProperty,
  ContentPermission,
} from '../../../../../../../../shared/contracts/permissions';
import type { Permission } from '../../../../../../../../shared/contracts/shared';

const localesProperty: SubjectProperty = {
  value: 'locales',
  label: 'Locales',
  children: [
    { value: 'en', label: 'English', isDefault: true },
    { value: 'fr', label: 'French' },
  ],
};

const makePermission = (locales: string[] | null | undefined): Permission => ({
  id: 1,
  createdAt: '',
  updatedAt: '',
  action: 'plugin::content-manager.explorer.read',
  actionParameters: {},
  subject: 'api::article.article',
  properties: locales === undefined ? {} : ({ locales } as Permission['properties']),
  conditions: [],
});

const layout = [
  {
    categoryId: 'contentManager',
    childrenForm: [
      {
        subCategoryId: 'collection-types',
        actions: [
          {
            actionId: 'plugin::content-manager.explorer.read',
            label: 'Read',
            applyToProperties: ['locales'],
            subjects: ['api::article.article'],
          },
        ],
      },
    ],
  },
];

const subject = {
  uid: 'api::article.article',
  label: 'Article',
  properties: [localesProperty],
};

const contentPermission = {
  actions: layout[0].childrenForm[0].actions,
  subjects: [subject],
};

describe('resolvePermissionPropertyValues (via createDefaultCTForm)', () => {
  const getLocales = (permissions: Permission[]) => {
    const form = createDefaultCTForm(contentPermission as ContentPermission, [], permissions);
    const action = form['api::article.article']?.['plugin::content-manager.explorer.read'];
    return 'properties' in action
      ? (action.properties as Record<string, unknown>).locales
      : undefined;
  };

  it('defaults to [defaultLocale] when locales is missing from the permission', () => {
    const locales = getLocales([makePermission(undefined)]);
    expect(locales).toEqual({ en: true, fr: false });
  });

  it('defaults to [defaultLocale] when locales is an empty array', () => {
    const locales = getLocales([makePermission([])]);
    expect(locales).toEqual({ en: true, fr: false });
  });

  it('expands null locales to all locales instead of narrowing to default', () => {
    const locales = getLocales([makePermission(null)]);
    expect(locales).toEqual({ en: true, fr: true });
  });

  it('preserves an explicit locale selection', () => {
    const locales = getLocales([makePermission(['fr'])]);
    expect(locales).toEqual({ en: false, fr: true });
  });
});
