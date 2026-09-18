import { fireEvent, render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { ASSET_DETAILS_TRIGGER_PROPS, ASSET_ITEM_CONTROL_PROPS } from '../../../constants';
import { AssetDetails, AssetDetailsDrawer, getBusyMessage } from '../AssetDetailsDrawer';

import type { AssetWithPopulatedCreatedBy } from '../../../../../../../../shared/contracts/files';

const mockAIAvailability = jest.fn(() => true);

jest.mock('@strapi/admin/strapi-admin/ee', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin/ee'),
  useAIAvailability: () => mockAIAvailability(),
}));

const baseAsset = {
  id: 1,
  name: 'photo.png',
  alternativeText: 'A photo',
  caption: 'A caption',
  ext: '.png',
  mime: 'image/png',
  size: 1024,
  width: 800,
  height: 600,
  hash: 'photo',
  url: '/uploads/photo.png',
  folder: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  formats: {},
  createdBy: null,
} as unknown as AssetWithPopulatedCreatedBy;

const buildFoldersHandler = () =>
  http.get('/upload/folders', () =>
    HttpResponse.json({
      data: [
        { id: 1, name: 'Test', pathId: 1, path: '/1' },
        { id: 2, name: 'Second', pathId: 2, path: '/1/2' },
      ],
    })
  );

const captureUpdateRequest = (responseAsset: AssetWithPopulatedCreatedBy = baseAsset) => {
  let resolveRequest: (request: { id: string | null; body: FormData }) => void;
  let rejectRequest: (error: unknown) => void;

  const requestPromise = new Promise<{ id: string | null; body: FormData }>((resolve, reject) => {
    resolveRequest = resolve;
    rejectRequest = reject;
  });

  server.use(
    http.put('/upload/files/:id', async ({ request, params }) => {
      try {
        resolveRequest({
          id: String(params.id),
          body: await request.formData(),
        });
      } catch (error) {
        rejectRequest(error);
      }

      return HttpResponse.json(responseAsset);
    })
  );

  return requestPromise;
};

const buildSettingsHandler = (aiMetadata = false) =>
  http.get('/upload/settings', () =>
    HttpResponse.json({
      data: {
        sizeOptimization: true,
        responsiveDimensions: true,
        autoOrientation: true,
        aiMetadata,
      },
    })
  );

describe('AssetDetails (asset details drawer body)', () => {
  beforeEach(() => {
    mockAIAvailability.mockReturnValue(true);
    server.use(buildFoldersHandler(), buildSettingsHandler());
  });

  it('seeds the form from the asset and keeps the save button disabled until a field changes', async () => {
    render(<AssetDetails asset={baseAsset} closeDetails={jest.fn()} />);

    const saveButton = await screen.findByRole('button', { name: 'Save changes' });
    expect(saveButton).toBeDisabled();
    expect(screen.getByDisplayValue('photo.png')).toBeInTheDocument();
    expect(screen.getByDisplayValue('A caption')).toBeInTheDocument();
    expect(screen.getByDisplayValue('A photo')).toBeInTheDocument();
  });

  it('opens the fullscreen crop editor from the preview and closes on cancel', async () => {
    const { user } = render(<AssetDetails asset={baseAsset} closeDetails={jest.fn()} />);
    await screen.findByRole('combobox');

    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: 'Crop' }));

    expect(await screen.findByRole('button', { name: 'Apply' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save as copy' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument()
    );
  });

  it('enables save when a field is edited and submits the new fileInfo to the update endpoint', async () => {
    const updateRequest = captureUpdateRequest({ ...baseAsset, name: 'updated.png' });

    const { user } = render(<AssetDetails asset={baseAsset} closeDetails={jest.fn()} />);

    const nameInput = await screen.findByDisplayValue('photo.png');
    // The field starts disabled until the RBAC check resolves.
    await waitFor(() => expect(nameInput).toBeEnabled());
    await user.clear(nameInput);
    await user.type(nameInput, 'updated.png');

    const saveButton = screen.getByRole('button', { name: 'Save changes' });
    await waitFor(() => expect(saveButton).toBeEnabled());
    fireEvent.click(saveButton);

    const captured = await updateRequest;
    expect(captured.id).toBe('1');

    const rawFileInfo = captured.body.get('fileInfo');
    expect(typeof rawFileInfo).toBe('string');
    const fileInfo = JSON.parse(rawFileInfo as string);
    expect(fileInfo).toMatchObject({
      name: 'updated.png',
      caption: 'A caption',
      alternativeText: 'A photo',
      folder: null,
    });
  });

  it('surfaces the server error message when the metadata save fails', async () => {
    server.use(
      http.put('*/upload/files/:id', () =>
        HttpResponse.json({ error: { message: 'name must be unique' } }, { status: 400 })
      )
    );

    const { user } = render(<AssetDetails asset={baseAsset} closeDetails={jest.fn()} />);

    const nameInput = await screen.findByDisplayValue('photo.png');
    await waitFor(() => expect(nameInput).toBeEnabled());
    await user.clear(nameInput);
    await user.type(nameInput, 'taken.png');

    const saveButton = screen.getByRole('button', { name: 'Save changes' });
    await waitFor(() => expect(saveButton).toBeEnabled());
    fireEvent.click(saveButton);

    await screen.findByText('name must be unique');
  });

  it('renders the Media Library root option plus every folder returned by the API', async () => {
    const { user } = render(<AssetDetails asset={baseAsset} closeDetails={jest.fn()} />);

    const select = await screen.findByRole('combobox');
    await user.click(select);

    await screen.findByRole('option', { name: 'Home' });
    expect(screen.getByRole('option', { name: 'Test' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Second' })).toBeInTheDocument();
  });

  it('sends the selected folder id when the location changes to a non-root folder', async () => {
    const updateRequest = captureUpdateRequest({ ...baseAsset, folder: 2 });

    const { user } = render(<AssetDetails asset={baseAsset} closeDetails={jest.fn()} />);

    const select = await screen.findByRole('combobox');
    await user.click(select);
    await user.click(await screen.findByRole('option', { name: 'Second' }));

    const saveButton = screen.getByRole('button', { name: 'Save changes' });
    await waitFor(() => expect(saveButton).toBeEnabled());
    fireEvent.click(saveButton);

    const captured = await updateRequest;
    const fileInfo = JSON.parse(captured.body.get('fileInfo') as string);
    expect(fileInfo.folder).toBe(2);
  });

  it('keeps location selectable and dirty-tracks the move back to the Media Library root', async () => {
    const assetInFolder = { ...baseAsset, folder: 2 };
    const updateRequest = captureUpdateRequest({ ...assetInFolder, folder: null });

    const { user } = render(<AssetDetails asset={assetInFolder} closeDetails={jest.fn()} />);

    const select = await screen.findByRole('combobox');
    await user.click(select);
    await user.click(await screen.findByRole('option', { name: 'Home' }));

    const saveButton = screen.getByRole('button', { name: 'Save changes' });
    await waitFor(() => expect(saveButton).toBeEnabled());
    fireEvent.click(saveButton);

    const captured = await updateRequest;
    const fileInfo = JSON.parse(captured.body.get('fileInfo') as string);
    expect(fileInfo.folder).toBeNull();
  });

  it('deletes the asset, closes the drawer, and toasts the parent folder name', async () => {
    const closeDetails = jest.fn();
    const assetInFolder = { ...baseAsset, folder: 2 };
    let deleteId: string | null = null;
    server.use(
      http.delete('/upload/files/:id', ({ params }) => {
        deleteId = String(params.id);
        return HttpResponse.json({ id: Number(params.id) });
      })
    );

    const { user } = render(<AssetDetails asset={assetInFolder} closeDetails={closeDetails} />);

    // Wait for folders query so the toast can resolve the folder name.
    await screen.findByRole('combobox');

    const trashButton = await screen.findByRole('button', { name: 'Delete this file' });
    await user.click(trashButton);

    // Dialog opens via Radix AlertDialog — match by the body copy.
    await screen.findByText(/This file cannot be recovered/i);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(deleteId).toBe('1'));
    await waitFor(() => expect(closeDetails).toHaveBeenCalledTimes(1));
  });

  it('deletes the asset currently shown after the drawer switches assets', async () => {
    const firstAsset = { ...baseAsset, id: 1, name: 'first.png' };
    const secondAsset = { ...baseAsset, id: 2, name: 'second.png' };
    let deleteId: string | null = null;

    server.use(
      http.delete('/upload/files/:id', ({ params }) => {
        deleteId = String(params.id);
        return HttpResponse.json({ id: Number(params.id) });
      })
    );

    const closeDetails = jest.fn();
    const { user, rerender } = render(
      <AssetDetails asset={firstAsset} closeDetails={closeDetails} />
    );
    await screen.findByRole('combobox');

    rerender(<AssetDetails asset={secondAsset} closeDetails={closeDetails} />);
    expect(await screen.findByDisplayValue('second.png')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete this file' }));
    await screen.findByText(/This file cannot be recovered/i);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(deleteId).not.toBeNull());
    expect(deleteId).toBe('2');
  });

  it('keeps the drawer open and surfaces the error message when the delete request fails', async () => {
    const closeDetails = jest.fn();
    server.use(
      http.delete('*/upload/files/:id', () =>
        HttpResponse.json(
          { error: { message: 'This file is used by 3 entries.' } },
          { status: 400 }
        )
      )
    );

    const { user } = render(<AssetDetails asset={baseAsset} closeDetails={closeDetails} />);

    await screen.findByRole('combobox');
    await user.click(await screen.findByRole('button', { name: 'Delete this file' }));
    await screen.findByText(/This file cannot be recovered/i);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await screen.findByText('This file is used by 3 entries.');
    await waitFor(() => expect(closeDetails).not.toHaveBeenCalled());
  });

  it('surfaces the server error message when the replace request fails', async () => {
    server.use(
      http.post('*/upload/files/:id/replace', () =>
        HttpResponse.json(
          { error: { message: 'photo.png exceeds size limit of 100 KB.' } },
          { status: 413 }
        )
      )
    );

    const { user } = render(<AssetDetails asset={baseAsset} closeDetails={jest.fn()} />);
    await screen.findByRole('combobox');

    await user.click(await screen.findByRole('button', { name: 'Replace this file' }));
    await screen.findByText(/Replace this media file\?/i);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['hello'], 'photo.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await screen.findByText('photo.png exceeds size limit of 100 KB.');
  });

  it('opens the confirm dialog when the trigger is clicked and uploads the file picked after Continue', async () => {
    // The admin test environment stashes the jsdom `FormData` body on the
    // Request (see admin-test-utils request-body-stash), so `request.formData()`
    // reliably returns the picked file here instead of relying on undici's
    // cross-realm multipart serialization (which yields a `text/plain` body).
    let captured: {
      id: string | null;
      file: FormDataEntryValue | null;
      fileInfo: FormDataEntryValue | null;
    } = {
      id: null,
      file: null,
      fileInfo: null,
    };
    server.use(
      http.post('/upload/files/:id/replace', async ({ request, params }) => {
        const body = await request.formData();
        captured = {
          id: String(params.id),
          file: body.get('files'),
          fileInfo: body.get('fileInfo'),
        };
        return HttpResponse.json({ ...baseAsset, name: 'replacement.png' });
      })
    );

    const { user } = render(<AssetDetails asset={baseAsset} closeDetails={jest.fn()} />);
    await screen.findByRole('combobox');

    // Confirm dialog must NOT be visible before the trigger is clicked.
    expect(screen.queryByText(/Replace this media file\?/i)).not.toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: 'Replace this file' }));

    await screen.findByText(/Replace this media file\?/i);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    // After Continue, the dialog closes and the picker fires. The picker is an
    // OS-level dialog we cannot drive from jsdom, so simulate the file pick by
    // dispatching a change event on the hidden native input.
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    expect(fileInput).not.toHaveAttribute('multiple');

    const file = new File(['hello'], 'replacement.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(captured.id).toBe('1'));
    expect(captured.file).toBeInstanceOf(File);
    expect((captured.file as File).name).toBe('replacement.png');
    expect(JSON.parse(String(captured.fileInfo))).toMatchObject({ name: 'photo.png' });
    // Success toast renders inside the drawer, above the preview, not in the
    // global notifications region.
    await screen.findByText(/File replaced\./i);
  });

  it('replaces the asset currently shown after the drawer switches assets', async () => {
    const firstAsset = { ...baseAsset, id: 1, name: 'first.png' };
    const secondAsset = { ...baseAsset, id: 2, name: 'second.png' };
    let replaceId: string | null = null;

    server.use(
      http.post('/upload/files/:id/replace', async ({ params }) => {
        replaceId = params.id as string;
        return HttpResponse.json({ ...secondAsset, name: 'replacement.png' });
      })
    );

    const closeDetails = jest.fn();
    const { user, rerender } = render(
      <AssetDetails asset={firstAsset} closeDetails={closeDetails} />
    );
    await screen.findByRole('combobox');

    rerender(<AssetDetails asset={secondAsset} closeDetails={closeDetails} />);
    expect(await screen.findByDisplayValue('second.png')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Replace this file' }));
    await screen.findByText(/Replace this media file\?/i);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['hello'], 'replacement.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(replaceId).not.toBeNull());
    expect(replaceId).toBe('2');
  });

  // The overlay covers the form while a mutation is in flight. It had no
  // coverage at all, which meant the `z-index` it needs to clear the in-drawer
  // toast slot, and the priority order of the messages, were both free to
  // regress silently — including through the extraction of `BusyOverlay`, which
  // this drawer now shares with the list's rows and cards.
  describe('busy overlay', () => {
    /**
     * Holds a request open so the in-flight state can be asserted, and hands
     * back the release. Without this the mutation settles inside the same
     * `act()` and the overlay never appears in a queryable state.
     */
    const gateRequest = (method: 'post' | 'delete', path: string) => {
      let release: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });

      server.use(
        http[method](path, async () => {
          await gate;
          return HttpResponse.json(baseAsset);
        })
      );

      return () => release();
    };

    it('covers the form while a replace is in flight and clears it once settled', async () => {
      const release = gateRequest('post', '/upload/files/:id/replace');

      const { user } = render(<AssetDetails asset={baseAsset} closeDetails={jest.fn()} />);
      await screen.findByRole('combobox');

      await user.click(await screen.findByRole('button', { name: 'Replace this file' }));
      await screen.findByText(/Replace this media file\?/i);
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, {
        target: { files: [new File(['hello'], 'replacement.png', { type: 'image/png' })] },
      });

      const overlayLabel = await screen.findByText('Replacing the file…');
      expect(overlayLabel).toBeInTheDocument();

      // The overlay has to clear the in-drawer toast slot (z-index 10) or the
      // "File replaced." alert renders on top of it. Since `BusyOverlay` became
      // shared, that value is a defaulted prop rather than a literal in this
      // file, so it needs pinning here.
      const overlay = overlayLabel.parentElement?.parentElement;
      expect(overlay).toHaveStyle({ zIndex: '20', position: 'absolute' });

      release();

      await waitFor(() =>
        expect(screen.queryByText('Replacing the file…')).not.toBeInTheDocument()
      );
    });

    it('names the delete while a delete is in flight', async () => {
      const release = gateRequest('delete', '/upload/files/:id');

      const { user } = render(<AssetDetails asset={baseAsset} closeDetails={jest.fn()} />);
      await screen.findByRole('combobox');

      await user.click(await screen.findByRole('button', { name: 'Delete this file' }));
      await screen.findByText(/This file cannot be recovered/i);
      fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

      expect(await screen.findByText('Deleting the file…')).toBeInTheDocument();

      release();
    });

    it('renders no overlay while the drawer is idle', async () => {
      render(<AssetDetails asset={baseAsset} closeDetails={jest.fn()} />);
      await screen.findByRole('combobox');

      expect(screen.queryByText('Replacing the file…')).not.toBeInTheDocument();
      expect(screen.queryByText('Deleting the file…')).not.toBeInTheDocument();
      expect(screen.queryByText('Saving the cropped copy…')).not.toBeInTheDocument();
    });

    // Driven directly rather than through the drawer: the branch order only
    // has an effect when two flags are true at once, and each trigger disables
    // itself while its own mutation runs, so the rendered UI can't stage the
    // overlap. Going through the component would pass whatever the order was.
    describe('getBusyMessage priority', () => {
      const idle = { isDeleting: false, isReplacing: false, isCropCopying: false };

      it('returns null when nothing is in flight', () => {
        expect(getBusyMessage(idle)).toBeNull();
      });

      it.each([
        ['delete', { ...idle, isDeleting: true }, 'Deleting the file…'],
        ['crop copy', { ...idle, isCropCopying: true }, 'Saving the cropped copy…'],
        ['replace', { ...idle, isReplacing: true }, 'Replacing the file…'],
      ])('names the %s when it is the only one running', (_label, state, expected) => {
        expect(getBusyMessage(state)?.defaultMessage).toBe(expected);
      });

      it.each([
        ['delete over crop copy', { ...idle, isDeleting: true, isCropCopying: true }],
        ['delete over replace', { ...idle, isDeleting: true, isReplacing: true }],
      ])('prefers %s', (_label, state) => {
        expect(getBusyMessage(state)?.defaultMessage).toBe('Deleting the file…');
      });

      it('prefers crop copy over replace', () => {
        expect(
          getBusyMessage({ ...idle, isCropCopying: true, isReplacing: true })?.defaultMessage
        ).toBe('Saving the cropped copy…');
      });
    });
  });

  it('shows the AI variant of the replace description when AI metadata is enabled in settings', async () => {
    server.use(buildSettingsHandler(true));

    const { user } = render(<AssetDetails asset={baseAsset} closeDetails={jest.fn()} />);
    await screen.findByRole('combobox');

    await user.click(await screen.findByRole('button', { name: 'Replace this file' }));

    await screen.findByText(/AI will generate new metadata after upload/i);
  });

  // The setting is stored (and defaults to on) regardless of licensing, so it
  // has to be ANDed with EE AI availability — otherwise plans without AI were
  // promised metadata that never gets generated.
  it('hides the AI variant when the license has no AI, even with the setting on', async () => {
    mockAIAvailability.mockReturnValue(false);
    server.use(buildSettingsHandler(true));

    const { user } = render(<AssetDetails asset={baseAsset} closeDetails={jest.fn()} />);
    await screen.findByRole('combobox');

    await user.click(await screen.findByRole('button', { name: 'Replace this file' }));

    await screen.findByText(/Current content will be permanently replaced/i);
    expect(
      screen.queryByText(/AI will generate new metadata after upload/i)
    ).not.toBeInTheDocument();
  });

  // A GIF passes the drawer's `image/*` check that renders this button, but the
  // AI provider's allowlist skips it, so the promise would not be kept.
  it('hides the AI variant for an image the AI provider cannot read', async () => {
    server.use(buildSettingsHandler(true));

    const { user } = render(
      <AssetDetails
        asset={{ ...baseAsset, mime: 'image/gif', ext: '.gif' } as AssetWithPopulatedCreatedBy}
        closeDetails={jest.fn()}
      />
    );
    await screen.findByRole('combobox');

    await user.click(await screen.findByRole('button', { name: 'Replace this file' }));

    await screen.findByText(/Current content will be permanently replaced/i);
    expect(
      screen.queryByText(/AI will generate new metadata after upload/i)
    ).not.toBeInTheDocument();
  });
});

describe('AssetDetails RBAC gating', () => {
  beforeEach(() => {
    server.use(buildFoldersHandler(), buildSettingsHandler());
  });

  const withoutAction = (action: string) => ({
    providerOptions: {
      permissions: (defaults: Array<{ action: string }>) =>
        defaults.filter((permission) => permission.action !== action),
    },
  });

  it('hides every mutating action and disables the fields without assets.update', async () => {
    render(
      <AssetDetails asset={baseAsset} closeDetails={jest.fn()} />,
      withoutAction('plugin::upload.assets.update')
    );

    const nameInput = await screen.findByDisplayValue('photo.png');
    await waitFor(() => expect(nameInput).toBeDisabled());
    expect(screen.getByDisplayValue('A caption')).toBeDisabled();
    expect(screen.getByDisplayValue('A photo')).toBeDisabled();

    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete this file' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Crop' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Replace this file' })).not.toBeInTheDocument();

    // Read-scoped actions survive.
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
  });

  it('drops the footer bar entirely when no footer action is permitted', async () => {
    render(<AssetDetails asset={baseAsset} closeDetails={jest.fn()} />, {
      providerOptions: {
        permissions: (defaults: Array<{ action: string }>) =>
          defaults.filter(
            (permission) =>
              ![
                'plugin::upload.assets.update',
                'plugin::upload.assets.download',
                'plugin::upload.assets.copy-link',
              ].includes(permission.action)
          ),
      },
    });

    const nameInput = await screen.findByDisplayValue('photo.png');
    await waitFor(() => expect(nameInput).toBeDisabled());

    for (const name of ['Save changes', 'Delete this file', 'Copy link', 'Download']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
  });

  it('hides the download action without assets.download', async () => {
    render(
      <AssetDetails asset={baseAsset} closeDetails={jest.fn()} />,
      withoutAction('plugin::upload.assets.download')
    );

    await screen.findByDisplayValue('photo.png');
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Download' })).not.toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete this file' })).toBeInTheDocument();
  });

  it('hides the copy link action without assets.copy-link', async () => {
    render(
      <AssetDetails asset={baseAsset} closeDetails={jest.fn()} />,
      withoutAction('plugin::upload.assets.copy-link')
    );

    await screen.findByDisplayValue('photo.png');
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Copy link' })).not.toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
  });
});

describe('Replace media placement', () => {
  beforeEach(() => {
    server.use(buildFoldersHandler(), buildSettingsHandler());
  });

  const pdfAsset = {
    ...baseAsset,
    name: 'report.pdf',
    ext: '.pdf',
    mime: 'application/pdf',
  } as AssetWithPopulatedCreatedBy;

  // Replace used to live in the preview overlay, which is image-gated, so it was
  // unavailable for anything that is not an image. In the footer it is gated on
  // `canUpdate` alone.
  it('offers Replace on a non-image asset, where Crop does not apply', async () => {
    render(<AssetDetails asset={pdfAsset} closeDetails={jest.fn()} />);

    expect(await screen.findByRole('button', { name: 'Replace this file' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Crop' })).not.toBeInTheDocument();
  });

  it('still offers Replace alongside Crop on an image', async () => {
    render(<AssetDetails asset={baseAsset} closeDetails={jest.fn()} />);

    expect(await screen.findByRole('button', { name: 'Replace this file' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crop' })).toBeInTheDocument();
  });

  it('offers only the same type in the file picker', async () => {
    render(<AssetDetails asset={pdfAsset} closeDetails={jest.fn()} />);

    await screen.findByRole('button', { name: 'Replace this file' });

    // The server pins the replacement to the old extension, so a cross-type pick
    // would leave the bytes and the URL disagreeing.
    // eslint-disable-next-line testing-library/no-node-access
    expect(document.querySelector('input[type="file"]')).toHaveAttribute(
      'accept',
      'application/pdf'
    );
  });
});

describe('icon button tooltips', () => {
  beforeEach(() => {
    server.use(buildFoldersHandler(), buildSettingsHandler());
  });

  // Every action in the drawer is icon-only, so the label is the only thing
  // naming it. All were already wired for accessibility; they just passed
  // `withTooltip={false}`, so a sighted user got no hover hint. Crop is in here
  // too, even though it sits on the preview rather than in the footer — being
  // the only icon button without a hint was the inconsistency.
  it.each([['Replace this file'], ['Delete this file'], ['Copy link'], ['Download'], ['Crop']])(
    'shows a tooltip on hover for %s',
    async (label) => {
      const { user } = render(<AssetDetails asset={baseAsset} closeDetails={jest.fn()} />);

      const button = await screen.findByRole('button', { name: label });
      await user.hover(button);

      expect(await screen.findByRole('tooltip')).toHaveTextContent(label);
    }
  );

  it('keeps the buttons reachable by their accessible name', async () => {
    render(<AssetDetails asset={baseAsset} closeDetails={jest.fn()} />);

    // Enabling the tooltip must not move the accessible name onto the tooltip
    // element and leave the button unnamed.
    for (const label of [
      'Replace this file',
      'Delete this file',
      'Copy link',
      'Download',
      'Crop',
    ]) {
      expect(await screen.findByRole('button', { name: label })).toBeInTheDocument();
    }
  });
});

/* -------------------------------------------------------------------------------------------------
 * Outside-click dismissal
 * -----------------------------------------------------------------------------------------------*/

describe('AssetDetailsDrawer outside-click dismissal', () => {
  beforeEach(() => {
    server.use(
      buildFoldersHandler(),
      buildSettingsHandler(),
      http.get('/upload/files/:id', () => HttpResponse.json(baseAsset))
    );
  });

  // jsdom never runs the slide-out animation, so "closed" is read off the
  // state attribute rather than the element disappearing.
  const renderOpenDrawer = async () => {
    const result = render(
      <>
        {/* Plain page background. */}
        <div data-testid="page-background">Background</div>
        {/* Stands in for a grid card/table row, whose click switches the drawer. */}
        <div data-testid="other-asset" {...ASSET_DETAILS_TRIGGER_PROPS}>
          Other asset
          {/* Its own controls, which act on the item rather than opening it. */}
          <span {...ASSET_ITEM_CONTROL_PROPS}>
            <button
              type="button"
              role="checkbox"
              aria-checked="false"
              data-testid="item-checkbox"
            />
            <button type="button" data-testid="item-actions">
              Actions
            </button>
          </span>
        </div>
        {/* The list's own controls, which dismiss it like any other outside press. */}
        <button type="button" data-testid="toolbar-button">
          Sort
        </button>
        <button type="button" role="checkbox" aria-checked="false" data-testid="select-all" />
        <input data-testid="search" aria-label="Search" />
        <div role="menuitem" data-testid="menu-option">
          Name (A to Z)
        </div>
        <AssetDetailsDrawer />
      </>,
      { initialEntries: ['/?assetId=1'] }
    );

    const drawer = await screen.findByRole('dialog');
    expect(drawer).toHaveAttribute('data-state', 'open');

    return { ...result, drawer };
  };

  it('closes when the pointer goes down on the page background', async () => {
    const { user, drawer } = await renderOpenDrawer();

    await user.click(screen.getByTestId('page-background'));

    await waitFor(() => expect(drawer).toHaveAttribute('data-state', 'closed'));
  });

  // A right-click is contextual — and on the assets background it opens the
  // create menu, so dismissing here would fire two outcomes from one press.
  it.each([
    ['a right-click', 2],
    ['a middle-click', 1],
  ])('stays open on %s outside the panel', async (_label, button) => {
    const { drawer } = await renderOpenDrawer();

    fireEvent.pointerDown(screen.getByTestId('page-background'), { button });

    await waitFor(() => expect(drawer).toHaveAttribute('data-state', 'open'));
  });

  // The primary button must still dismiss — the guard is about which button,
  // not about disabling dismissal.
  it('still closes on a primary-button press outside the panel', async () => {
    const { drawer } = await renderOpenDrawer();

    fireEvent.pointerDown(screen.getByTestId('page-background'), { button: 0 });

    await waitFor(() => expect(drawer).toHaveAttribute('data-state', 'closed'));
  });

  // Anywhere behind the panel dismisses it, controls included — pressing one is
  // still leaving the drawer.
  it.each([
    ['a toolbar button', 'toolbar-button'],
    ['the select-all checkbox', 'select-all'],
    ['the search field', 'search'],
    ['an option in a menu portaled out of the page', 'menu-option'],
  ])('closes when the pointer goes down on %s', async (_label, testId) => {
    const { user, drawer } = await renderOpenDrawer();

    await user.click(screen.getByTestId(testId));

    await waitFor(() => expect(drawer).toHaveAttribute('data-state', 'closed'));
  });

  it('stays open when the pointer goes down inside the panel', async () => {
    const { user, drawer } = await renderOpenDrawer();

    await user.click(await screen.findByRole('button', { name: 'Copy link' }));

    expect(drawer).toHaveAttribute('data-state', 'open');
  });

  // Dismissing on the pointerdown would turn switching assets into a
  // close-then-reopen round trip.
  it('stays open when the pointer goes down on another asset', async () => {
    const { user, drawer } = await renderOpenDrawer();

    await user.click(screen.getByTestId('other-asset'));

    expect(drawer).toHaveAttribute('data-state', 'open');
  });

  // The card is exempt because its click switches the drawer — but its checkbox
  // selects the asset and stops that click, so nothing switches and it closes.
  it.each([
    ["the asset's own checkbox", 'item-checkbox'],
    ["the asset's own actions menu", 'item-actions'],
  ])('closes when the pointer goes down on %s', async (_label, testId) => {
    const { user, drawer } = await renderOpenDrawer();

    await user.click(screen.getByTestId(testId));

    await waitFor(() => expect(drawer).toHaveAttribute('data-state', 'closed'));
  });

  // The delete confirmation is portaled to the body but rendered from inside
  // the drawer, so Radix treats it as "inside".
  it('stays open while interacting with a dialog opened from inside it', async () => {
    const { user, drawer } = await renderOpenDrawer();

    await user.click(await screen.findByRole('button', { name: 'Delete this file' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(drawer).toHaveAttribute('data-state', 'open');
  });

  // The press happened inside, so there's no outside pointerdown to act on.
  it('stays open when a drag started inside the panel ends outside it', async () => {
    const { drawer } = await renderOpenDrawer();

    const title = await screen.findByRole('heading', { name: 'photo.png' });
    fireEvent.pointerDown(title);
    fireEvent.pointerUp(screen.getByTestId('page-background'));

    expect(drawer).toHaveAttribute('data-state', 'open');
  });
});
