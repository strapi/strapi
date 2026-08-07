import * as React from 'react';

import { render, screen } from '@tests/utils';

import { mutateEditViewHook } from '../editView';

import type { EditFieldLayout, EditLayout } from '@strapi/content-manager/strapi-admin';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ slug: 'api::test.test' }),
  };
});

// Mock CM hooks used by tests
const mockUseDocumentLayout = jest.fn(() => ({ edit: undefined as unknown as EditLayout }));
jest.mock('@strapi/content-manager/strapi-admin', () => {
  const actual = jest.requireActual('@strapi/content-manager/strapi-admin');
  return {
    ...actual,
    unstable_useDocumentLayout: () => mockUseDocumentLayout(),
  };
});

const mockUseGetLocalesQuery = jest.fn(() => ({
  data: [{ code: 'en', isDefault: true, name: 'English' }],
}));
const mockUseQueryParams = jest.fn(() => [{ query: { plugins: { i18n: { locale: 'en' } } } }]);

jest.mock('../../services/locales', () => ({
  useGetLocalesQuery: () => mockUseGetLocalesQuery(),
}));

jest.mock('@strapi/admin/strapi-admin', () => {
  const actual = jest.requireActual('@strapi/admin/strapi-admin');
  return {
    ...actual,
    useQueryParams: () => mockUseQueryParams(),
  };
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('mutateEditViewHook – label action injection and localization', () => {
  const makeEditField = (overrides: Record<string, unknown> = {}): EditFieldLayout =>
    ({
      attribute: { type: 'string', pluginOptions: { i18n: { localized: true } } },
      disabled: false,
      hint: '',
      label: 'Title',
      name: 'title',
      mainField: 'id',
      placeholder: '',
      required: false,
      size: 12,
      unique: false,
      visible: true,
      type: 'string',
      ...overrides,
    }) as unknown as EditFieldLayout;

  const makeEditLayout = (opts: {
    ctLocalized: boolean;
    topFields?: EditFieldLayout[][];
    components?: EditLayout['components'];
  }): EditLayout => {
    return {
      layout: opts.topFields ? [[...opts.topFields]] : [[[]]],
      components: opts.components ?? {},
      metadatas: {},
      options: {
        i18n: { localized: opts.ctLocalized },
      },
      settings: {
        bulkable: false,
        defaultSortBy: '',
        defaultSortOrder: 'asc',
        filterable: false,
        searchable: false,
        pageSize: 10,
        mainField: 'id',
      },
    } as unknown as EditLayout;
  };

  it('does nothing when content type is not localized', () => {
    const titleField = makeEditField();

    const layout = makeEditLayout({ ctLocalized: false, topFields: [[titleField]] });

    const { layout: mutated } = mutateEditViewHook({ layout });
    const mutatedField = mutated.layout[0][0][0];
    expect(mutatedField.labelAction).toBeUndefined();
  });

  it('injects a labelAction element when content type is localized (root-level field)', () => {
    const titleField = makeEditField();

    const layout = makeEditLayout({ ctLocalized: true, topFields: [[titleField]] });

    // Provide layout for render-time logic
    mockUseDocumentLayout.mockReturnValue({ edit: layout });

    const { layout: mutated } = mutateEditViewHook({ layout });
    const action = mutated.layout[0][0][0].labelAction as React.ReactElement | undefined;
    expect(React.isValidElement(action)).toBe(true);

    if (action) {
      render(action);
      expect(screen.getByText(/This value is unique for the selected locale/i)).toBeInTheDocument();
    }
  });

  it('does not show a localization icon for a non-localized field on the default locale', () => {
    const componentUid = 'shared.button';

    const layout = makeEditLayout({
      ctLocalized: true,
      topFields: [
        [
          makeEditField({
            attribute: {
              type: 'component',
              component: componentUid,
              pluginOptions: { i18n: { localized: false } },
            },
            label: 'CTA',
            name: 'cta',
            type: 'component',
          }),
        ],
      ],
      components: {
        [componentUid]: {
          layout: [],
          settings: {
            displayName: 'Button',
          } as unknown as EditLayout['components'][string]['settings'],
        },
      },
    });

    mockUseDocumentLayout.mockReturnValue({ edit: layout });
    mockUseQueryParams.mockReturnValue([{ query: { plugins: { i18n: { locale: 'en' } } } }]);
    mockUseGetLocalesQuery.mockReturnValue({
      data: [{ code: 'en', isDefault: true, name: 'English' }],
    });

    const { layout: mutated } = mutateEditViewHook({ layout });
    const action = mutated.layout[0][0][0].labelAction as React.ReactElement;

    // NonLocalizedLabelAction mounts but renders null on the default locale (#24890).
    expect(React.isValidElement(action)).toBe(true);
    render(action);
    expect(
      screen.queryByText(/This value is unique for the selected locale/i)
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/This value is common to all locales/i)).not.toBeInTheDocument();
  });

  it('shows a locked tooltip for non-localized fields on a non-default locale', () => {
    const titleField = makeEditField({
      attribute: { type: 'string', pluginOptions: { i18n: { localized: false } } },
    });

    const layout = makeEditLayout({ ctLocalized: true, topFields: [[titleField]] });
    mockUseDocumentLayout.mockReturnValue({ edit: layout });
    mockUseQueryParams.mockReturnValue([{ query: { plugins: { i18n: { locale: 'fr' } } } }]);
    mockUseGetLocalesQuery.mockReturnValue({
      data: [
        { code: 'en', isDefault: true, name: 'English' },
        { code: 'fr', isDefault: false, name: 'French' },
      ],
    });

    const { layout: mutated } = mutateEditViewHook({ layout });
    const action = mutated.layout[0][0][0].labelAction as React.ReactElement;

    render(action);
    expect(
      screen.getByText(/This value is common to all locales. Edit it in the default locale./i)
    ).toBeInTheDocument();
  });

  it('does not show a lock icon for non-localized dynamic zones', () => {
    const dzField = makeEditField({
      attribute: {
        type: 'dynamiczone',
        components: ['shared.button'],
        pluginOptions: { i18n: { localized: false } },
      },
      label: 'Body',
      name: 'body',
      type: 'dynamiczone',
    });

    const layout = makeEditLayout({ ctLocalized: true, topFields: [[dzField]] });
    mockUseDocumentLayout.mockReturnValue({ edit: layout });
    mockUseQueryParams.mockReturnValue([{ query: { plugins: { i18n: { locale: 'fr' } } } }]);
    mockUseGetLocalesQuery.mockReturnValue({
      data: [
        { code: 'en', isDefault: true, name: 'English' },
        { code: 'fr', isDefault: false, name: 'French' },
      ],
    });

    const { layout: mutated } = mutateEditViewHook({ layout });
    expect(mutated.layout[0][0][0].labelAction).toBeUndefined();
  });

  it('does not stamp lock icons onto nested component fields', () => {
    const componentUid = 'shared.button';
    const nestedField = makeEditField({
      attribute: { type: 'string', pluginOptions: { i18n: { localized: false } } },
      label: 'Label',
      name: 'label',
    });

    const layout = makeEditLayout({
      ctLocalized: true,
      topFields: [
        [
          makeEditField({
            attribute: {
              type: 'component',
              component: componentUid,
              pluginOptions: { i18n: { localized: false } },
            },
            label: 'CTA',
            name: 'cta',
            type: 'component',
          }),
        ],
      ],
      components: {
        [componentUid]: {
          layout: [[nestedField]],
          settings: {
            displayName: 'Button',
          } as unknown as EditLayout['components'][string]['settings'],
        },
      },
    });

    mockUseDocumentLayout.mockReturnValue({ edit: layout });
    mockUseQueryParams.mockReturnValue([{ query: { plugins: { i18n: { locale: 'fr' } } } }]);
    mockUseGetLocalesQuery.mockReturnValue({
      data: [
        { code: 'en', isDefault: true, name: 'English' },
        { code: 'fr', isDefault: false, name: 'French' },
      ],
    });

    const { layout: mutated } = mutateEditViewHook({ layout });
    const nestedAction = mutated.components[componentUid].layout[0][0].labelAction;
    expect(nestedAction).toBeUndefined();
  });

  it('treats relations without i18n pluginOptions as localized (server parity)', () => {
    const relationField = makeEditField({
      attribute: { type: 'relation' },
    });

    const layout = makeEditLayout({ ctLocalized: true, topFields: [[relationField]] });
    mockUseDocumentLayout.mockReturnValue({ edit: layout });
    mockUseQueryParams.mockReturnValue([{ query: { plugins: { i18n: { locale: 'fr' } } } }]);
    mockUseGetLocalesQuery.mockReturnValue({
      data: [
        { code: 'en', isDefault: true, name: 'English' },
        { code: 'fr', isDefault: false, name: 'French' },
      ],
    });

    const { layout: mutated } = mutateEditViewHook({ layout });
    const action = mutated.layout[0][0][0].labelAction as React.ReactElement;

    render(action);
    expect(screen.getByText(/This value is unique for the selected locale/i)).toBeInTheDocument();
    expect(screen.queryByText(/This value is common to all locales/i)).not.toBeInTheDocument();
  });
});
