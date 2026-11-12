import * as React from 'react';

import { UnsavedChangesModal } from '@strapi/admin/strapi-admin';
import { Modal } from '@strapi/design-system';
import { render, server, screen, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { ReleaseActionModalForm } from '../ReleaseActionModal';

import type { DocumentActionProps } from '@strapi/content-manager/strapi-admin';

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useRBAC: jest.fn(() => ({
    isLoading: false,
    allowedActions: { canCreateAction: true },
  })),
}));

jest.mock('@strapi/content-manager/strapi-admin', () => ({
  ...jest.requireActual('@strapi/content-manager/strapi-admin'),
  unstable_useDocumentLayout: jest.fn(() => ({
    edit: { options: { draftAndPublish: true } },
  })),
}));

const RELEASES = [
  { id: 1, name: 'Release 1' },
  { id: 2, name: 'Release 2' },
];

const PROPS = {
  activeTab: 'draft',
  collectionType: 'collection-types',
  documentId: 'abc',
  document: { documentId: 'abc', id: 1 },
  meta: { availableLocales: [], availableStatus: [] },
  model: 'api::article.article',
} as unknown as DocumentActionProps;

/**
 * Hosts the action's modal the same way the content-manager's `DocumentActionModal` does.
 */
const ActionHost = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const action = ReleaseActionModalForm(PROPS);

  if (!action || !action.dialog || action.dialog.type !== 'modal') {
    return null;
  }

  const { title, content, footer: Footer, onClose } = action.dialog;

  const handleClose = () => {
    onClose?.();
    setIsOpen(false);
  };

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>
        {action.label}
      </button>
      <UnsavedChangesModal open={isOpen} onOpenChange={handleClose}>
        <Modal.Content>
          <Modal.Header>
            <Modal.Title>{title}</Modal.Title>
          </Modal.Header>
          <Modal.Body>{content as React.ReactNode}</Modal.Body>
          {typeof Footer === 'function' ? <Footer onClose={handleClose} /> : Footer}
        </Modal.Content>
      </UnsavedChangesModal>
    </>
  );
};

const openAndSelectRelease = async (user: ReturnType<typeof render>['user'], name: string) => {
  await user.click(await screen.findByRole('button', { name: 'Add to release' }));
  await user.click(await screen.findByRole('combobox', { name: 'Select a release' }));
  await user.click(await screen.findByRole('option', { name }));
};

describe('ReleaseActionModalForm', () => {
  beforeEach(() => {
    window.strapi.isEE = true;

    server.use(
      http.get('/content-releases/getByDocumentAttached', () =>
        HttpResponse.json({ data: RELEASES })
      )
    );
  });

  afterEach(() => {
    window.strapi.isEE = false;
  });

  it('adds the entry to the selected release, then closes the modal', async () => {
    const requests: Array<{ releaseId: string; body: unknown }> = [];
    let resolveRequest = () => {};
    const requestDone = new Promise<void>((resolve) => {
      resolveRequest = resolve;
    });

    server.use(
      http.post('/content-releases/:releaseId/actions', async ({ params, request }) => {
        requests.push({ releaseId: params.releaseId as string, body: await request.json() });
        await requestDone;

        return HttpResponse.json({ data: { id: 1, type: 'publish' } });
      })
    );

    const { user } = render(<ActionHost />);

    await openAndSelectRelease(user, 'Release 2');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    // The modal (and its form values) stays until the request has finished
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(screen.getByRole('dialog', { name: 'Add to release' })).toBeInTheDocument();

    resolveRequest();

    expect(await screen.findByText('Entry added to release')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    expect(requests).toHaveLength(1);
    expect(requests[0].releaseId).toBe('2');
    expect(requests[0].body).toMatchObject({
      type: 'publish',
      contentType: 'api::article.article',
      entryDocumentId: 'abc',
    });
  });

  it('shows an error and keeps the modal open when the request fails', async () => {
    server.use(
      http.post('/content-releases/:releaseId/actions', () =>
        HttpResponse.json(
          {
            error: {
              status: 400,
              name: 'ValidationError',
              message: 'Entry already in release',
              details: {},
            },
          },
          { status: 400 }
        )
      )
    );

    const { user } = render(<ActionHost />);

    await openAndSelectRelease(user, 'Release 1');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('An error occurred')).toBeInTheDocument();
    expect(screen.queryByText('Entry added to release')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Add to release' })).toBeInTheDocument();
  });

  it('starts empty after discarding a selected release', async () => {
    const { user } = render(<ActionHost />);

    await openAndSelectRelease(user, 'Release 1');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    const confirm = await screen.findByRole('alertdialog');
    expect(confirm).toHaveTextContent('You have unsaved changes');
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Add to release' }));

    expect(await screen.findByRole('combobox', { name: 'Select a release' })).toHaveTextContent(
      'Select'
    );
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });
});
