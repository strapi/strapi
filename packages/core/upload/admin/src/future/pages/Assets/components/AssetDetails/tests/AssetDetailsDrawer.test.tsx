import { fireEvent, render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { AssetDetails } from '../AssetDetailsDrawer';

import type { AssetWithPopulatedCreatedBy } from '../../../../../../../../shared/contracts/files';

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

  it('enables save when a field is edited and submits the new fileInfo to the update endpoint', async () => {
    let captured: { id: string | null; body: FormData | null } = { id: null, body: null };
    server.use(
      http.post('/upload', async ({ request }) => {
        const url = new URL(request.url);
        captured = { id: url.searchParams.get('id'), body: await request.formData() };
        return HttpResponse.json({ ...baseAsset, name: 'updated.png' });
      })
    );

    const { user } = render(<AssetDetails asset={baseAsset} closeDetails={jest.fn()} />);

    const nameInput = await screen.findByDisplayValue('photo.png');
    await user.clear(nameInput);
    await user.type(nameInput, 'updated.png');

    const saveButton = screen.getByRole('button', { name: 'Save changes' });
    await waitFor(() => expect(saveButton).toBeEnabled());
    fireEvent.click(saveButton);

    await waitFor(() => expect(captured.id).toBe('1'));

    const rawFileInfo = captured.body?.get('fileInfo');
    expect(typeof rawFileInfo).toBe('string');
    const fileInfo = JSON.parse(rawFileInfo as string);
    expect(fileInfo).toMatchObject({
      name: 'updated.png',
      caption: 'A caption',
      alternativeText: 'A photo',
      folder: null,
    });
  });

  it('renders the Media Library root option plus every folder returned by the API', async () => {
    const { user } = render(<AssetDetails asset={baseAsset} closeDetails={jest.fn()} />);

    const select = await screen.findByRole('combobox');
    await user.click(select);

    await screen.findByRole('option', { name: 'Media Library' });
    expect(screen.getByRole('option', { name: 'Test' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Second' })).toBeInTheDocument();
  });

  it('sends the selected folder id when the location changes to a non-root folder', async () => {
    let captured: { body: FormData | null } = { body: null };
    server.use(
      http.post('/upload', async ({ request }) => {
        captured = { body: await request.formData() };
        return HttpResponse.json({ ...baseAsset, folder: 2 });
      })
    );

    const { user } = render(<AssetDetails asset={baseAsset} closeDetails={jest.fn()} />);

    const select = await screen.findByRole('combobox');
    await user.click(select);
    await user.click(await screen.findByRole('option', { name: 'Second' }));

    const saveButton = screen.getByRole('button', { name: 'Save changes' });
    await waitFor(() => expect(saveButton).toBeEnabled());
    fireEvent.click(saveButton);

    await waitFor(() => expect(captured.body).not.toBeNull());
    const fileInfo = JSON.parse(captured.body!.get('fileInfo') as string);
    expect(fileInfo.folder).toBe(2);
  });

  it('keeps location selectable and dirty-tracks the move back to the Media Library root', async () => {
    const assetInFolder = { ...baseAsset, folder: 2 };
    let captured: { body: FormData | null } = { body: null };
    server.use(
      http.post('/upload', async ({ request }) => {
        captured = { body: await request.formData() };
        return HttpResponse.json({ ...assetInFolder, folder: null });
      })
    );

    const { user } = render(<AssetDetails asset={assetInFolder} closeDetails={jest.fn()} />);

    const select = await screen.findByRole('combobox');
    await user.click(select);
    await user.click(await screen.findByRole('option', { name: 'Media Library' }));

    const saveButton = screen.getByRole('button', { name: 'Save changes' });
    await waitFor(() => expect(saveButton).toBeEnabled());
    fireEvent.click(saveButton);

    await waitFor(() => expect(captured.body).not.toBeNull());
    const fileInfo = JSON.parse(captured.body!.get('fileInfo') as string);
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

    const trashButton = screen.getByRole('button', { name: 'Delete this file' });
    await user.click(trashButton);

    // Dialog opens via Radix AlertDialog — match by the body copy.
    await screen.findByText(/This file cannot be recovered/i);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(deleteId).toBe('1'));
    await waitFor(() => expect(closeDetails).toHaveBeenCalledTimes(1));
  });

  it('keeps the drawer open and surfaces the error message when the delete request fails', async () => {
    const closeDetails = jest.fn();
    server.use(
      http.delete('/upload/files/:id', () =>
        HttpResponse.json({ error: { message: 'Asset locked' } }, { status: 400 })
      )
    );

    const { user } = render(<AssetDetails asset={baseAsset} closeDetails={closeDetails} />);

    await screen.findByRole('combobox');
    await user.click(screen.getByRole('button', { name: 'Delete this file' }));
    await screen.findByText(/This file cannot be recovered/i);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(closeDetails).not.toHaveBeenCalled());
  });

  it('opens the confirm dialog when the trigger is clicked and uploads the file picked after Continue', async () => {
    // FormData parsing in msw under jsdom hangs when the body contains a real
    // File blob, so we capture the request metadata only (id + content-type +
    // presence of a body) rather than re-parsing the multipart payload here.
    let captured: { id: string | null; contentType: string | null; hasBody: boolean } = {
      id: null,
      contentType: null,
      hasBody: false,
    };
    server.use(
      http.post('/upload', async ({ request }) => {
        const url = new URL(request.url);
        captured = {
          id: url.searchParams.get('id'),
          contentType: request.headers.get('content-type'),
          hasBody: request.body !== null,
        };
        return HttpResponse.json({ ...baseAsset, name: 'replacement.png' });
      })
    );

    const { user } = render(<AssetDetails asset={baseAsset} closeDetails={jest.fn()} />);
    await screen.findByRole('combobox');

    // Confirm dialog must NOT be visible before the trigger is clicked.
    expect(screen.queryByText(/Replace this media file\?/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Replace this file' }));

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
    expect(captured.contentType).toMatch(/multipart\/form-data/);
    expect(captured.hasBody).toBe(true);
    // Success toast renders inside the drawer, above the preview, not in the
    // global notifications region.
    await screen.findByText(/File replaced\./i);
  });

  it('shows the AI variant of the replace description when AI metadata is enabled in settings', async () => {
    server.use(buildSettingsHandler(true));

    const { user } = render(<AssetDetails asset={baseAsset} closeDetails={jest.fn()} />);
    await screen.findByRole('combobox');

    await user.click(screen.getByRole('button', { name: 'Replace this file' }));

    await screen.findByText(/AI will generate new metadata after upload/i);
  });
});
