import { render } from '@tests/utils';

import { InputRenderer } from '../InputRenderer';

const genericRenderer = jest.fn((_props: Record<string, unknown>) => null);

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  InputRenderer: (props: Record<string, unknown>) => genericRenderer(props),
  useStrapiApp: (_name: string, selector: (app: unknown) => unknown) => selector({ fields: {} }),
  useForm: (_name: string, selector: (state: unknown) => unknown) => selector({ disabled: false }),
  useField: () => ({}),
}));

jest.mock('../../../../features/DocumentRBAC', () => ({
  useDocumentRBAC: (_name: string, selector: (rbac: unknown) => unknown) =>
    selector({
      canCreateFields: [],
      canReadFields: [],
      canUpdateFields: [],
      canUserAction: () => true,
    }),
}));

jest.mock('../../../../hooks/useDocumentContext', () => ({
  useDocumentContext: () => ({ currentDocument: undefined, currentDocumentMeta: { model: 'm' } }),
}));

jest.mock('../../../../hooks/useDocumentLayout', () => ({
  useDocumentLayout: () => ({ edit: { components: {} } }),
}));

jest.mock('../../../../hooks/useLazyComponents', () => ({
  useLazyComponents: () => ({ lazyComponentStore: {} }),
}));

jest.mock('../FormInputs/DynamicZone/Field', () => ({
  ...jest.requireActual('../FormInputs/DynamicZone/Field'),
  useDynamicZone: () => false,
}));

jest.mock('../../../../preview/components/InputPopover', () => ({
  useHasInputPopoverParent: () => false,
  usePreviewPopoverBlockIndex: () => undefined,
}));

jest.mock('../../../../preview/hooks/usePreviewInputManager', () => ({
  usePreviewInputManager: () => ({}),
}));

const document = { document: { documentId: 'doc' }, schema: { kind: 'collectionType' } } as any;

describe('<InputRenderer />', () => {
  beforeEach(() => {
    genericRenderer.mockClear();
  });

  it('does not forward `attribute` to the generic renderer for primitive fields', () => {
    render(
      <InputRenderer
        document={document}
        visible
        name="title"
        label="Title"
        type="string"
        attribute={{ type: 'string' }}
      />
    );

    const props = genericRenderer.mock.calls[0][0];
    expect(props).toMatchObject({ name: 'title', type: 'string' });
    expect(props).not.toHaveProperty('attribute');
  });

  it('does not forward `attribute` for enumerations but still builds the options from it', () => {
    render(
      <InputRenderer
        document={document}
        visible
        name="status"
        label="Status"
        type="enumeration"
        attribute={{ type: 'enumeration', enum: ['a', 'b'] }}
      />
    );

    const props = genericRenderer.mock.calls[0][0];
    expect(props.options).toEqual([{ value: 'a' }, { value: 'b' }]);
    expect(props).not.toHaveProperty('attribute');
  });
});
