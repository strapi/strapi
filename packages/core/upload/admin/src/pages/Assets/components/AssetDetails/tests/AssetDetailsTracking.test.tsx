import { fireEvent, render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { uploadFileViaXHR } from '../../../../../services/uploadFileViaXHR';
import { AssetDetails, AssetDetailsDrawer } from '../AssetDetailsDrawer';

import type { AssetWithPopulatedCreatedBy } from '../../../../../../../shared/contracts/files';

const mockTrackUsage = jest.fn();

jest.mock('../../../../../hooks/useTracking', () => ({
  ...jest.requireActual('../../../../../hooks/useTracking'),
  useTracking: () => ({ trackUsage: mockTrackUsage }),
}));

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

beforeEach(() => {
  mockTrackUsage.mockClear();
  server.use(
    http.get('/upload/folders', () => HttpResponse.json({ data: [] })),
    http.get('/upload/settings', () =>
      HttpResponse.json({ data: { aiMetadata: false, aiMetadataAvailable: false } })
    ),
    http.get('/upload/files/:id', () => HttpResponse.json(baseAsset)),
    http.put('/upload/files/:id', () => HttpResponse.json(baseAsset)),
    http.post('/upload/files/:id/replace', () => HttpResponse.json(baseAsset))
  );
  jest
    .mocked(uploadFileViaXHR)
    .mockResolvedValue({ ...baseAsset, id: 2 } as unknown as Awaited<
      ReturnType<typeof uploadFileViaXHR>
    >);
});

type User = ReturnType<typeof render>['user'];

const saveMetadata = async (user: User) => {
  const caption = await screen.findByDisplayValue('A caption');
  // The field starts disabled until the RBAC check resolves.
  await waitFor(() => expect(caption).toBeEnabled());
  await user.type(caption, '!');
  const save = screen.getByRole('button', { name: 'Save changes' });
  await waitFor(() => expect(save).toBeEnabled());
  fireEvent.click(save);
};

const replaceFile = async (user: User) => {
  await user.click(await screen.findByRole('button', { name: 'Replace this file' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Continue' }));
  // The native file picker can't be driven from jsdom: pick on the hidden input.
  // eslint-disable-next-line testing-library/no-node-access
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(fileInput, {
    target: { files: [new File(['new'], 'photo.png', { type: 'image/png' })] },
  });
};

const cropThen = (action: 'Apply' | 'Save as copy') => async (user: User) => {
  await user.click(await screen.findByRole('button', { name: 'Crop' }));
  await user.click(await screen.findByRole('button', { name: action }));
};

describe('AssetDetails tracking location', () => {
  it('tags events with the Media Library location by default', async () => {
    const { user } = render(<AssetDetails asset={baseAsset} closeDetails={jest.fn()} />);

    await saveMetadata(user);

    await waitFor(() =>
      expect(mockTrackUsage).toHaveBeenCalledWith(
        'didEditMediaLibraryElements',
        expect.objectContaining({ location: 'upload' })
      )
    );
  });

  it.each([
    ['didEditMediaLibraryElements', {}, saveMetadata],
    ['didReplaceMedia', {}, replaceFile],
    ['didCropFile', { duplicatedFile: false }, cropThen('Apply')],
    ['didCropFile', { duplicatedFile: true }, cropThen('Save as copy')],
  ])('tags %s %o with the given location', async (event, properties, act) => {
    const { user } = render(
      <AssetDetails asset={baseAsset} closeDetails={jest.fn()} trackedLocation="content-manager" />
    );
    await screen.findByRole('combobox');

    await act(user);

    await waitFor(() =>
      expect(mockTrackUsage).toHaveBeenCalledWith(
        event,
        expect.objectContaining({ ...properties, location: 'content-manager' })
      )
    );
  });
});

describe('AssetDetailsDrawer tracking location', () => {
  it('passes the location through to the details', async () => {
    const { user } = render(
      <AssetDetailsDrawer assetId={1} onClose={jest.fn()} trackedLocation="content-manager" />
    );

    await replaceFile(user);

    await waitFor(() =>
      expect(mockTrackUsage).toHaveBeenCalledWith('didReplaceMedia', {
        location: 'content-manager',
      })
    );
  });
});
