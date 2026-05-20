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

describe('AssetDetails (asset details drawer body)', () => {
  beforeEach(() => {
    server.use(buildFoldersHandler());
  });

  it('seeds the form from the asset and keeps the save button disabled until a field changes', async () => {
    render(<AssetDetails asset={baseAsset} />);

    const saveButton = await screen.findByRole('button', { name: 'Save' });
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

    const { user } = render(<AssetDetails asset={baseAsset} />);

    const nameInput = await screen.findByDisplayValue('photo.png');
    await user.clear(nameInput);
    await user.type(nameInput, 'updated.png');

    const saveButton = screen.getByRole('button', { name: 'Save' });
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
    const { user } = render(<AssetDetails asset={baseAsset} />);

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

    const { user } = render(<AssetDetails asset={baseAsset} />);

    const select = await screen.findByRole('combobox');
    await user.click(select);
    await user.click(await screen.findByRole('option', { name: 'Second' }));

    const saveButton = screen.getByRole('button', { name: 'Save' });
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

    const { user } = render(<AssetDetails asset={assetInFolder} />);

    const select = await screen.findByRole('combobox');
    await user.click(select);
    await user.click(await screen.findByRole('option', { name: 'Media Library' }));

    const saveButton = screen.getByRole('button', { name: 'Save' });
    await waitFor(() => expect(saveButton).toBeEnabled());
    fireEvent.click(saveButton);

    await waitFor(() => expect(captured.body).not.toBeNull());
    const fileInfo = JSON.parse(captured.body!.get('fileInfo') as string);
    expect(fileInfo.folder).toBeNull();
  });
});
