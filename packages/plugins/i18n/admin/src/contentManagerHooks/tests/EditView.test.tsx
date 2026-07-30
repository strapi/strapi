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

// Mock CM hook once and override return per-test
const mockUseDocumentLayout = jest.fn(() => ({ edit: undefined as unknown as EditLayout }));
jest.mock('@strapi/content-manager/strapi-admin', () => {
  const actual = jest.requireActual('@strapi/content-manager/strapi-admin');
  return {
    ...actual,
    unstable_useDocumentLayout: () => mockUseDocumentLayout(),
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

  it('does not show localization icon for a non-localized component field', () => {
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

    const { layout: mutated } = mutateEditViewHook({ layout });
    const action = mutated.layout[0][0][0].labelAction as React.ReactElement;

    render(action);
    expect(
      screen.queryByText(/This value is unique for the selected locale/i)
    ).not.toBeInTheDocument();
  });
});
