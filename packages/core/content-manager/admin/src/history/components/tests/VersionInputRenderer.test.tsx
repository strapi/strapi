/**
 * Regression tests for the history-page CustomRelationInput.
 *
 * The component renders a relation field's value using a `{ results, meta }`
 * shape produced by the server's populate path. Some scenarios deliver the
 * field value in a different shape and used to crash with
 * `Cannot read properties of undefined (reading 'length')`:
 *
 *   - one-to-one relation persisted as a single object (no `.results`)
 *   - admin-user relation sanitized server-side to a plain user object
 *   - a relation attribute removed from the schema, whose stored historical
 *     value is the raw payload (server's populate skipped it)
 *
 * Also covers #27137 — custom fields that read `value`/`onChange` from props
 * (not `useField`) must receive the form field bag, matching Edit View.
 */
import * as React from 'react';

import { Form } from '@strapi/admin/strapi-admin';
import { render as renderRTL, screen } from '@tests/utils';

import { type HistoryContextValue, HistoryProvider } from '../../pages/History';
import {
  CustomRelationInput,
  resolveComponentRenderResources,
  VersionInputRenderer,
} from '../VersionInputRenderer';

import type { RelationsFieldProps } from '../../../pages/EditView/components/FormInputs/Relations/Relations';
import type { UID } from '@strapi/types';

jest.mock('../../../hooks/useDocument', () => ({
  useDoc: () => ({ id: 'doc-1', components: {} }),
  useDocument: () => ({ isLoading: false, components: {} }),
}));

jest.mock('../../../hooks/useDocumentLayout', () => ({
  useDocLayout: () => ({
    edit: { components: {} },
  }),
  useDocumentLayout: () => ({
    edit: { components: {} },
  }),
}));

/**
 * Simulates a custom field that only reads `value` from props (TinyMCE / CKEditor
 * style) — the contract restored for Edit View in #21163 and missing in History.
 */
jest.mock('../../../hooks/useLazyComponents', () => ({
  useLazyComponents: () => ({
    isLazyLoading: false,
    lazyComponentStore: {
      'plugin::test.prop-based': ({ value }: { value?: unknown }) =>
        React.createElement(
          'div',
          { 'data-testid': 'prop-based-custom-field' },
          value == null || value === '' ? 'MISSING_VALUE' : String(value)
        ),
    },
    cleanup: jest.fn(),
  }),
}));

const baseAttribute = {
  type: 'relation' as const,
  relation: 'oneToMany' as const,
  targetModel: 'api::category.category',
  target: 'api::category.category',
};

type RenderFieldOptions = {
  /** Form field path; must match a key in `initialFormValues` */
  name?: string;
  label?: string;
};

const renderField = (
  initialFormValues: Record<string, unknown>,
  attributeOverrides: Partial<RelationsFieldProps['attribute']> = {},
  options: RenderFieldOptions = {}
) => {
  const name = options.name ?? 'categories';
  const label = options.label ?? 'Categories';
  return renderRTL(
    <CustomRelationInput
      // @ts-expect-error - test setup uses minimal attribute shape
      attribute={{ ...baseAttribute, ...attributeOverrides }}
      label={label}
      name={name}
      type="relation"
      mainField={{ name: 'name', type: 'string' }}
    />,
    {
      renderOptions: {
        wrapper: ({ children }) => (
          <Form method="POST" initialValues={initialFormValues} onSubmit={jest.fn()}>
            {children}
          </Form>
        ),
      },
    }
  );
};

describe('CustomRelationInput (history)', () => {
  it('renders "No relations" when the field value is the expected `{ results, meta }` shape with an empty list', async () => {
    renderField({ categories: { results: [], meta: { missingCount: 0 } } });
    expect(await screen.findByText(/No relations/i)).toBeInTheDocument();
  });

  it('does not crash when the historical field value is a single relation object (no `results` key)', async () => {
    // Shape that triggered the crash before the fix: a one-to-one relation
    // persisted as a single object, or any relation whose attribute was
    // removed from the schema so the server's populate skipped it.
    renderField({ categories: { id: 1, documentId: 'abc', name: 'Whatever' } });
    expect(await screen.findByText(/No relations/i)).toBeInTheDocument();
  });

  it('does not crash when the historical field value is a sanitized admin-user object', async () => {
    // Admin-user relations are sanitized server-side to a plain user object,
    // not the `{ results, meta }` shape — same crash class as above.
    // `name` must match the key in `initialValues` so useField reads the value.
    renderField(
      {
        manager: { id: 7, firstname: 'Ada', lastname: 'Lovelace', email: 'ada@example.test' },
      },
      // @ts-expect-error - test override
      { targetModel: 'admin::user', target: 'admin::user' },
      { name: 'manager', label: 'Manager' }
    );
    expect(await screen.findByText(/No relations/i)).toBeInTheDocument();
  });

  it('does not crash when the field value is null', async () => {
    renderField({ categories: null });
    expect(await screen.findByText(/No relations/i)).toBeInTheDocument();
  });

  it('does not crash when the field value is undefined', async () => {
    renderField({});
    expect(await screen.findByText(/No relations/i)).toBeInTheDocument();
  });

  it('renders the populated relation cards when the value carries results', async () => {
    renderField({
      categories: {
        results: [{ id: 1, documentId: 'doc-1', name: 'A', status: 'draft' }],
        meta: { missingCount: 0 },
      },
    });
    // Renders the relation label rather than the empty-state copy.
    expect(screen.queryByText(/No relations/i)).not.toBeInTheDocument();
  });
});

/**
 * Regression tests for the helper that resolves a component's render resources
 * on the history page. When a component schema is deleted via the Content-Type
 * Builder while a historical version still references it, the destructure
 * `const { layout } = componentsLayout[uid]` used to crash. The helper now
 * returns `null` so the caller can fall back to a label-only render.
 */
describe('resolveComponentRenderResources', () => {
  const componentsLayout = {
    'default.kept': { layout: [[{ name: 'title' }]] },
  };
  const configurationComponents = {
    'default.kept': { metadatas: { title: { edit: { label: 'Title', visible: true } } } },
  };
  const components = {
    'default.kept': { attributes: { title: { type: 'string' } } },
  };

  it('returns layout/metadatas/schemaAttributes when the component is fully present', () => {
    const result = resolveComponentRenderResources(
      'default.kept',
      componentsLayout,
      configurationComponents,
      components
    );
    expect(result).toEqual({
      layout: componentsLayout['default.kept'].layout,
      metadatas: configurationComponents['default.kept'].metadatas,
      schemaAttributes: components['default.kept'].attributes,
    });
  });

  it('returns null when the component is missing from the layout dict (deleted via CTB)', () => {
    expect(
      resolveComponentRenderResources(
        'default.gone',
        componentsLayout,
        configurationComponents,
        components
      )
    ).toBeNull();
  });

  it('returns null when the component is missing from the configuration dict', () => {
    expect(
      resolveComponentRenderResources('default.kept', componentsLayout, {}, components)
    ).toBeNull();
  });

  it('returns null when the component is missing from the schemas dict', () => {
    expect(
      resolveComponentRenderResources('default.kept', componentsLayout, configurationComponents, {})
    ).toBeNull();
  });

  it('returns null when all three dicts are empty', () => {
    expect(resolveComponentRenderResources('default.kept', {}, {}, {})).toBeNull();
  });
});

/**
 * #27137 — History must pass `...useField(name)` into custom field Inputs so
 * plugins that bind `value`/`onChange` from props (docs / Edit View contract)
 * show the historical value instead of rendering empty.
 */
describe('VersionInputRenderer custom fields (#27137)', () => {
  const HISTORY_VALUE = '<p>hello from history</p>';

  const selectedVersion = {
    id: '26',
    contentType: 'api::article.article' as UID.ContentType,
    relatedDocumentId: 'doc-1',
    createdAt: '2022-01-01T00:00:00Z',
    status: 'draft' as const,
    schema: {},
    componentsSchemas: {},
    locale: null,
    data: {
      custom_body: HISTORY_VALUE,
    },
    meta: {
      unknownAttributes: {
        added: {},
        removed: {},
      },
    },
  };

  const historyContext = {
    selectedVersion,
    configuration: { contentType: { metadatas: {} }, components: {} },
  } as Partial<HistoryContextValue>;

  it('passes the form field value to custom fields that read value from props', async () => {
    renderRTL(
      // @ts-expect-error — partial HistoryContext is enough for this path
      <HistoryProvider {...historyContext}>
        <Form method="POST" initialValues={{ custom_body: HISTORY_VALUE }} onSubmit={jest.fn()}>
          <VersionInputRenderer
            visible
            shouldIgnoreRBAC
            name="custom_body"
            label="Custom body"
            type="string"
            // @ts-expect-error — minimal attribute shape for a custom field
            attribute={{ type: 'string', customField: 'plugin::test.prop-based' }}
          />
        </Form>
      </HistoryProvider>
    );

    expect(await screen.findByTestId('prop-based-custom-field')).toHaveTextContent(HISTORY_VALUE);
    expect(screen.queryByText('MISSING_VALUE')).not.toBeInTheDocument();
  });
});
