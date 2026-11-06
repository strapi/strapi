import { Form, type Permission } from '@strapi/admin/strapi-admin';
import { render, screen } from '@tests/utils';
import { Route, Routes } from 'react-router-dom';

import { DocumentRBAC, useDocumentRBAC } from '../../../../features/DocumentRBAC';
import { InputRenderer } from '../InputRenderer';

import type { UseDocument } from '../../../../hooks/useDocument';

jest.mock('../../../../hooks/useDocumentContext', () => ({
  useDocumentContext: () => ({
    currentDocument: { components: {}, schema: { kind: 'singleType' } },
    currentDocumentMeta: { collectionType: 'single-types', model: 'api::homepage.homepage' },
  }),
}));

jest.mock('../../../../hooks/useDocumentLayout', () => ({
  useDocumentLayout: () => ({ edit: { components: {} } }),
}));

jest.mock('../../../../hooks/useLazyComponents', () => ({
  useLazyComponents: () => ({ lazyComponentStore: {} }),
}));

jest.mock('../../../../preview/components/InputPopover', () => ({
  useHasInputPopoverParent: () => false,
  usePreviewPopoverBlockIndex: () => undefined,
}));

jest.mock('../../../../preview/hooks/usePreviewInputManager', () => ({
  usePreviewInputManager: () => ({}),
}));

jest.mock('../FormInputs/DynamicZone/Field', () => ({
  DynamicZone: () => null,
  useDynamicZone: () => false,
}));

const MODEL = 'api::homepage.homepage';
const FIELD_NAME = 'issue21331Title';

const makePermission = (
  action: 'create' | 'read' | 'update',
  fields?: string[]
): Permission => ({
  id: action.length,
  action: `plugin::content-manager.explorer.${action}`,
  actionParameters: {},
  subject: MODEL,
  properties: fields ? { fields } : {},
  conditions: [],
});

const renderField = ({
  permissions,
  documentId,
  initialValue = 'Saved value',
}: {
  permissions: Permission[];
  documentId?: string;
  initialValue?: string;
}) => {
  const document = {
    components: {},
    schema: { kind: 'singleType' },
    document: documentId ? { documentId } : undefined,
  };

  return render(
    <Routes>
      <Route
        path="/content-manager/:collectionType/:slug"
        element={
          <DocumentRBAC permissions={permissions}>
            <Form
              initialValues={{ [FIELD_NAME]: initialValue }}
              method={documentId ? 'PUT' : 'POST'}
            >
              <PermissionStatus />
              <InputRenderer
                attribute={{ type: 'string' }}
                document={document as ReturnType<UseDocument>}
                label="Title"
                name={FIELD_NAME}
                type="string"
                visible
              />
            </Form>
          </DocumentRBAC>
        }
      />
    </Routes>,
    {
      initialEntries: ['/content-manager/single-types/api::homepage.homepage'],
      providerOptions: { permissions },
    }
  );
};

const PermissionStatus = () => {
  const isLoading = useDocumentRBAC('test', (state) => state.isLoading);
  return <span>{isLoading ? 'loading-permissions' : 'permissions-ready'}</span>;
};

describe('InputRenderer field permissions for Single Types', () => {
  it('shows a saved field with READ permission and no CREATE permission', async () => {
    renderField({
      documentId: 'saved-single-type',
      permissions: [makePermission('read')],
    });

    await screen.findByText('permissions-ready');
    expect(await screen.findByRole('textbox', { name: 'Title' })).toHaveValue('Saved value');
    expect(screen.getByRole('textbox', { name: 'Title' })).toBeDisabled();
  });

  it('uses CREATE field permissions for a new Single Type', async () => {
    renderField({
      permissions: [makePermission('create', [FIELD_NAME])],
      initialValue: 'New value',
    });

    await screen.findByText('permissions-ready');
    expect(await screen.findByRole('textbox', { name: 'Title' })).toHaveValue('New value');
    expect(screen.getByRole('textbox', { name: 'Title' })).toBeEnabled();
  });

  it('keeps UPDATE field permissions separate from READ field permissions', async () => {
    renderField({
      documentId: 'saved-single-type',
      permissions: [
        makePermission('read', [FIELD_NAME]),
        makePermission('update', ['otherField']),
      ],
    });

    await screen.findByText('permissions-ready');
    expect(await screen.findByRole('textbox', { name: 'Title' })).toHaveValue('Saved value');
    expect(screen.getByRole('textbox', { name: 'Title' })).toBeDisabled();
  });

  it('does not show a saved field excluded by READ field permissions', async () => {
    renderField({
      documentId: 'saved-single-type',
      permissions: [makePermission('read', ['otherField'])],
    });

    await screen.findByText('permissions-ready');
    expect(await screen.findByPlaceholderText('No permissions to see this field')).toBeDisabled();
  });
});
