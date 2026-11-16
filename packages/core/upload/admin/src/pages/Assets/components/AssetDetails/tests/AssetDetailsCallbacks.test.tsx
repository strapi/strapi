import { fireEvent, render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { uploadFileViaXHR } from '../../../../../services/uploadFileViaXHR';
import { AssetDetails } from '../AssetDetailsDrawer';

import type { AssetWithPopulatedCreatedBy } from '../../../../../../../shared/contracts/files';

jest.mock('../../../../../services/uploadFileViaXHR', () => ({
  ...jest.requireActual('../../../../../services/uploadFileViaXHR'),
  uploadFileViaXHR: jest.fn(),
}));

// The real editor produces the cropped file through a canvas, which jsdom lacks.
jest.mock('../AssetCropEditor', () => ({
  AssetCropEditor: ({
    onApply,
    onSaveAsCopy,
  }: {
    onApply: (file: File, focalPoint: { x: number; y: number }) => void;
    onSaveAsCopy: (file: File, focalPoint: { x: number; y: number }) => void;
  }) => {
    const cropped = new File(['cropped'], 'photo.png', { type: 'image/png' });
    return (
      <>
        <button type="button" onClick={() => onApply(cropped, { x: 50, y: 50 })}>
          Apply
        </button>
        <button type="button" onClick={() => onSaveAsCopy(cropped, { x: 50, y: 50 })}>
          Save as copy
        </button>
      </>
    );
  },
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

const updatedAsset = {
  ...baseAsset,
  updatedAt: '2026-02-02T00:00:00.000Z',
} as AssetWithPopulatedCreatedBy;

beforeEach(() => {
  server.use(
    http.get('/upload/folders', () => HttpResponse.json({ data: [] })),
    http.get('/upload/settings', () =>
      HttpResponse.json({ data: { aiMetadata: false, aiMetadataAvailable: false } })
    )
  );
});

const renderDetails = (props: Partial<React.ComponentProps<typeof AssetDetails>> = {}) => {
  const onAssetChange = jest.fn();
  const result = render(
    <AssetDetails
      asset={baseAsset}
      closeDetails={jest.fn()}
      onAssetChange={onAssetChange}
      {...props}
    />
  );

  return { ...result, onAssetChange };
};

describe('AssetDetails change callbacks', () => {
  it('reports the saved asset after a metadata update', async () => {
    server.use(http.put('/upload/files/:id', () => HttpResponse.json(updatedAsset)));
    const { user, onAssetChange } = renderDetails();

    const caption = await screen.findByDisplayValue('A caption');
    // The field starts disabled until the RBAC check resolves.
    await waitFor(() => expect(caption).toBeEnabled());
    await user.clear(caption);
    await user.type(caption, 'New caption');

    const save = screen.getByRole('button', { name: 'Save changes' });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);

    await waitFor(() => expect(onAssetChange).toHaveBeenCalledWith(updatedAsset));
  });

  it('reports the replaced asset', async () => {
    server.use(http.post('/upload/files/:id/replace', () => HttpResponse.json(updatedAsset)));
    const { user, onAssetChange } = renderDetails();
    await screen.findByRole('combobox');

    await user.click(await screen.findByRole('button', { name: 'Replace this file' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Continue' }));
    // The native file picker can't be driven from jsdom: pick on the hidden input.
    // eslint-disable-next-line testing-library/no-node-access
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: { files: [new File(['new'], 'photo.png', { type: 'image/png' })] },
    });

    await waitFor(() => expect(onAssetChange).toHaveBeenCalledWith(updatedAsset));
  });

  it('reports the asset after a crop applied to the original', async () => {
    server.use(http.post('/upload/files/:id/replace', () => HttpResponse.json(updatedAsset)));
    const { user, onAssetChange } = renderDetails();

    await user.click(await screen.findByRole('button', { name: 'Crop' }));
    await user.click(await screen.findByRole('button', { name: 'Apply' }));

    await waitFor(() => expect(onAssetChange).toHaveBeenCalledWith(updatedAsset));
  });

  // The copy is a new asset; the one shown is untouched.
  it('stays silent when the crop is saved as a copy', async () => {
    jest
      .mocked(uploadFileViaXHR)
      .mockResolvedValue({ ...baseAsset, id: 2 } as unknown as Awaited<
        ReturnType<typeof uploadFileViaXHR>
      >);
    const { user, onAssetChange } = renderDetails();

    await user.click(await screen.findByRole('button', { name: 'Crop' }));
    await user.click(await screen.findByRole('button', { name: 'Save as copy' }));

    await screen.findByText('Copy created.');
    expect(onAssetChange).not.toHaveBeenCalled();
  });

  it('stays silent when the update fails', async () => {
    server.use(
      http.put('*/upload/files/:id', () =>
        HttpResponse.json({ error: { message: 'name must be unique' } }, { status: 400 })
      )
    );
    const { user, onAssetChange } = renderDetails();

    const caption = await screen.findByDisplayValue('A caption');
    await waitFor(() => expect(caption).toBeEnabled());
    await user.type(caption, '!');
    const save = screen.getByRole('button', { name: 'Save changes' });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);

    await screen.findByText('name must be unique');
    expect(onAssetChange).not.toHaveBeenCalled();
  });
});
