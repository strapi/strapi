import { adminApi, Form } from '@strapi/admin/strapi-admin';
import { render, screen, waitFor, fireEvent, act } from '@tests/utils';

import {
  uploadFileViaXHR,
  UploadAbortedError,
  UploadFileError,
} from '../../../services/uploadFileViaXHR';
import { uploadProgressReducer } from '../../../store/uploadProgress';
import { MediaLibraryInput } from '../MediaLibraryInput';

import type { File as AssetFile } from '../../../../../shared/contracts/files';

const mockUploadFromUrls = jest.fn();

jest.mock('../../../services/api', () => {
  const actual = jest.requireActual('../../../services/api');

  return {
    ...actual,
    useUploadFromUrlsMutation: () => [mockUploadFromUrls],
  };
});

jest.mock('../../../services/uploadFileViaXHR', () => ({
  ...jest.requireActual('../../../services/uploadFileViaXHR'),
  uploadFileViaXHR: jest.fn(),
}));

const mockUploadFileViaXHR = uploadFileViaXHR as jest.MockedFunction<typeof uploadFileViaXHR>;

const mockPermissions = { isLoading: false, canCreate: true };

jest.mock('../../../hooks/useMediaLibraryPermissions', () => ({
  useMediaLibraryPermissions: () => ({
    canUpdate: true,
    canDownload: true,
    canCopyLink: true,
    ...mockPermissions,
  }),
}));

/**
 * The picker still opens the legacy dialog until the Content Manager gets its
 * own. It pulls in cropperjs, which jsdom cannot parse.
 */
jest.mock('cropperjs/dist/cropper.css?raw', () => '', { virtual: true });

const asset = (id: number, name: string): AssetFile =>
  ({
    id,
    name,
    mime: 'image/png',
    ext: '.png',
    url: `/uploads/${name}`,
    hash: `hash_${id}`,
    size: 10,
    provider: 'local',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }) as AssetFile;

const image = (name: string) => new File(['x'], name, { type: 'image/png' });

interface PendingRequest {
  name: string;
  fileInfo: Record<string, unknown>;
  signal: AbortSignal;
  resolve: (file: AssetFile) => void;
  reject: (error: Error) => void;
}

/**
 * Every request the upload pool sends, held until the test settles it. Each
 * one rejects on its own when its signal aborts, as the real XHR helper does.
 */
let requests: PendingRequest[] = [];

const nextId = (() => {
  let id = 100;
  return () => {
    id += 1;
    return id;
  };
})();

const request = (name: string) => {
  const found = requests.find((pending) => pending.name === name);

  if (!found) {
    throw new Error(`No upload request for ${name}`);
  }

  return found;
};

const settle = async (name: string, outcome: 'complete' | 'fail' = 'complete') => {
  await act(async () => {
    if (outcome === 'complete') {
      request(name).resolve(asset(nextId(), name));
    } else {
      request(name).reject(new UploadFileError('Server error'));
    }
  });
};

// The harness store has no `uploadProgress` slice (the plugin registers it at
// runtime), and overriding `reducer` replaces the whole map.
const storeConfig = {
  reducer: {
    [adminApi.reducerPath]: adminApi.reducer,
    admin_app: (state = { token: 'test-token' }) => state,
    uploadProgress: uploadProgressReducer,
  },
};

const renderInput = (
  props: Partial<React.ComponentProps<typeof MediaLibraryInput>> = {},
  initialValues: Record<string, unknown> = {}
) =>
  render(<MediaLibraryInput name="cover" label="Cover" {...props} />, {
    providerOptions: { storeConfig },
    renderOptions: {
      wrapper: ({ children }) => (
        <Form onSubmit={jest.fn()} method="POST" initialValues={initialValues}>
          {children}
        </Form>
      ),
    },
  });

const getDropZone = () => screen.getByRole('button', { name: 'Drag & drop an asset here' });

const dropFiles = (files: globalThis.File[]) => {
  fireEvent.drop(getDropZone(), {
    dataTransfer: { files, types: ['Files'] },
  });
};

describe('<MediaLibraryInput /> (Content Manager)', () => {
  // jsdom has no object URLs; uploads preview the picked file through them.
  const { createObjectURL, revokeObjectURL } = URL;
  const { matchMedia } = window;

  /** jsdom matches no media query, which reads as the narrowest phone. */
  const setViewportWidth = (viewportWidth: number) => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: viewportWidth >= Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0),
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  };

  beforeAll(() => {
    URL.createObjectURL = jest.fn(() => 'blob:preview');
    URL.revokeObjectURL = jest.fn();
  });

  afterAll(() => {
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    window.matchMedia = matchMedia;
  });

  beforeEach(() => {
    setViewportWidth(1440);
    requests = [];
    mockUploadFromUrls.mockReset();
    mockPermissions.isLoading = false;
    mockPermissions.canCreate = true;

    mockUploadFileViaXHR.mockReset();
    mockUploadFileViaXHR.mockImplementation(
      (_url, _token, formData, signal) =>
        new Promise((resolve, reject) => {
          const file = formData.get('files') as globalThis.File;
          signal.addEventListener('abort', () => reject(new UploadAbortedError()));
          requests.push({
            name: file.name,
            fileInfo: JSON.parse(formData.get('fileInfo') as string),
            signal,
            resolve: resolve as (file: AssetFile) => void,
            reject,
          });
        })
    );
  });

  describe('single field', () => {
    it('shows only the drop zone while empty', () => {
      renderInput();

      expect(getDropZone()).toBeInTheDocument();
    });

    it('shows the asset it holds, with no drop zone', () => {
      renderInput({}, { cover: asset(1, 'one.png') });

      expect(screen.getByText('one.png')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copy link to media' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remove one.png' })).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Drag & drop an asset here' })
      ).not.toBeInTheDocument();
    });

    it('shows the upload in progress, then the uploaded asset', async () => {
      renderInput();

      dropFiles([image('photo.png')]);

      await waitFor(() => expect(requests).toHaveLength(1));
      expect(screen.getByText('photo.png')).toBeInTheDocument();
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      await settle('photo.png');

      expect(screen.queryByText('Uploading...')).not.toBeInTheDocument();
      expect(screen.getByText('photo.png')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remove photo.png' })).toBeInTheDocument();
    });

    it('uploads to the Media Library root', async () => {
      renderInput();

      dropFiles([image('photo.png')]);

      await waitFor(() => expect(requests).toHaveLength(1));
      // No current folder in an entry form: uploads land at the root.
      expect(request('photo.png').fileInfo).toEqual({
        name: 'photo.png',
        caption: null,
        alternativeText: null,
        folder: null,
      });
    });

    it('replaces the asset it held', async () => {
      renderInput({}, { cover: asset(1, 'old.png') });

      // The drop zone is gone once the field holds an asset; the device picker
      // is the way to replace it.
      // eslint-disable-next-line testing-library/no-node-access
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [image('new.png')] } });

      await waitFor(() => expect(requests).toHaveLength(1));
      await settle('new.png');

      expect(screen.getByText('new.png')).toBeInTheDocument();
      expect(screen.queryByText('old.png')).not.toBeInTheDocument();
    });

    it('refuses a multi-file drop, and uploads nothing', async () => {
      renderInput();

      dropFiles([image('one.png'), image('two.png')]);

      expect(await screen.findByText('This field accepts only one file.')).toBeInTheDocument();
      expect(mockUploadFileViaXHR).not.toHaveBeenCalled();
    });

    it('cancels an upload from its row', async () => {
      const { user } = renderInput();

      dropFiles([image('photo.png')]);
      await waitFor(() => expect(requests).toHaveLength(1));

      await user.click(screen.getByRole('button', { name: 'Cancel upload of photo.png' }));

      expect(request('photo.png').signal.aborted).toBe(true);
      expect(screen.queryByText('photo.png')).not.toBeInTheDocument();
      expect(getDropZone()).toBeInTheDocument();
    });

    it('keeps a failed upload on the field until it is removed', async () => {
      const { user } = renderInput();

      dropFiles([image('photo.png')]);
      await waitFor(() => expect(requests).toHaveLength(1));
      await settle('photo.png', 'fail');

      expect(screen.getByText('photo.png')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Remove' }));

      expect(screen.queryByText('photo.png')).not.toBeInTheDocument();
      expect(getDropZone()).toBeInTheDocument();
    });

    it('retries a failed upload and adds it once it lands', async () => {
      const { user } = renderInput();

      dropFiles([image('photo.png')]);
      await waitFor(() => expect(requests).toHaveLength(1));
      await settle('photo.png', 'fail');

      requests = [];
      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await waitFor(() => expect(requests).toHaveLength(1));
      expect(screen.getByText('Uploading...')).toBeInTheDocument();

      await settle('photo.png');

      expect(screen.getByRole('button', { name: 'Remove photo.png' })).toBeInTheDocument();
    });

    it('copies the link of the asset', async () => {
      const { user } = renderInput({}, { cover: asset(1, 'one.png') });
      const writeText = jest.spyOn(navigator.clipboard, 'writeText');

      await user.click(screen.getByRole('button', { name: 'Copy link to media' }));

      expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/uploads/one.png'));
      expect(await screen.findByText('Link copied.')).toBeInTheDocument();
    });

    it('removes the asset', async () => {
      const { user } = renderInput({}, { cover: asset(1, 'one.png') });

      await user.click(screen.getByRole('button', { name: 'Remove one.png' }));

      expect(screen.queryByText('one.png')).not.toBeInTheDocument();
      expect(getDropZone()).toBeInTheDocument();
    });
  });

  describe('multiple field', () => {
    const multiple = { attribute: { multiple: true } };

    it('shows only the drop zone while empty', () => {
      renderInput(multiple);

      expect(getDropZone()).toBeInTheDocument();
    });

    it('shows one card per asset, followed by the drop zone', () => {
      renderInput(multiple, { cover: [asset(1, 'one.png'), asset(2, 'two.png')] });

      expect(screen.getByText('one.png')).toBeInTheDocument();
      expect(screen.getByText('two.png')).toBeInTheDocument();
      expect(getDropZone()).toBeInTheDocument();
    });

    it('adds each file as it lands, keeping the assets already there', async () => {
      const { user } = renderInput(multiple, { cover: [asset(1, 'one.png')] });

      dropFiles([image('first.png'), image('second.png')]);
      await waitFor(() => expect(requests).toHaveLength(1));

      await settle('first.png');
      await waitFor(() => expect(requests).toHaveLength(2));

      expect(
        screen.getByRole('button', { name: 'More actions for first.png' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Cancel upload of second.png' })
      ).toBeInTheDocument();

      await settle('second.png');

      // The row scrolls to the newest card; the asset already there is one page back.
      expect(
        screen.getByRole('button', { name: 'More actions for second.png' })
      ).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Previous slide' }));
      expect(screen.getByRole('button', { name: 'More actions for one.png' })).toBeInTheDocument();
    });

    it('keeps both batches when a second drop lands while the first is still uploading', async () => {
      renderInput(multiple);

      dropFiles([image('first.png')]);
      await waitFor(() => expect(requests).toHaveLength(1));
      dropFiles([image('second.png')]);

      await settle('first.png');
      await waitFor(() => expect(requests).toHaveLength(2));
      await settle('second.png');

      expect(
        screen.getByRole('button', { name: 'More actions for first.png' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'More actions for second.png' })
      ).toBeInTheDocument();
    });

    it('cancels one upload without stopping the others', async () => {
      const { user } = renderInput({ attribute: { multiple: true } });

      dropFiles([image('first.png'), image('second.png')]);
      await waitFor(() => expect(requests).toHaveLength(1));

      await user.click(screen.getByRole('button', { name: 'Cancel upload of first.png' }));

      expect(request('first.png').signal.aborted).toBe(true);
      await waitFor(() => expect(requests).toHaveLength(2));
      await settle('second.png');

      expect(screen.queryByText('first.png')).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'More actions for second.png' })
      ).toBeInTheDocument();
    });

    it('shows a failed upload with retry and remove', async () => {
      renderInput(multiple);

      dropFiles([image('photo.png')]);
      await waitFor(() => expect(requests).toHaveLength(1));
      await settle('photo.png', 'fail');

      expect(screen.getByRole('button', { name: 'Retry uploading photo.png' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remove photo.png' })).toBeInTheDocument();
    });

    it('refuses a file the field does not allow, and uploads nothing', async () => {
      renderInput({ attribute: { multiple: true, allowedTypes: ['images'] } });

      dropFiles([new File(['x'], 'notes.pdf', { type: 'application/pdf' })]);

      expect(await screen.findByText(/You can't upload this type of file/)).toBeInTheDocument();
      expect(mockUploadFileViaXHR).not.toHaveBeenCalled();
    });

    it('uploads the allowed files of a mixed drop and warns about the rest', async () => {
      renderInput({ attribute: { multiple: true, allowedTypes: ['images'] } });

      dropFiles([image('photo.png'), new File(['x'], 'notes.pdf', { type: 'application/pdf' })]);

      await waitFor(() => expect(requests).toHaveLength(1));
      expect(requests[0].name).toBe('photo.png');
      expect(await screen.findByText(/You can't upload this type of file/)).toBeInTheDocument();
    });

    it('removes an asset from its menu', async () => {
      const { user } = renderInput(multiple, {
        cover: [asset(1, 'one.png'), asset(2, 'two.png')],
      });

      await user.click(screen.getByRole('button', { name: 'More actions for one.png' }));
      await user.click(await screen.findByRole('menuitem', { name: 'Remove' }));

      expect(screen.queryByText('one.png')).not.toBeInTheDocument();
      expect(screen.getByText('two.png')).toBeInTheDocument();
    });

    it('pages through the assets when they do not fit on one row', async () => {
      const assets = [1, 2, 3].map((id) => asset(id, `asset-${id}.png`));
      const { user } = renderInput(multiple, { cover: assets });

      // Two cards at most, whatever the width.
      expect(screen.getByText('asset-1.png')).toBeInTheDocument();
      expect(screen.getByText('asset-2.png')).toBeInTheDocument();
      expect(screen.queryByText('asset-3.png')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Previous slide' })).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Next slide' }));

      expect(screen.queryByText('asset-1.png')).not.toBeInTheDocument();
      expect(screen.getByText('asset-3.png')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Next slide' })).not.toBeInTheDocument();
      expect(getDropZone()).toBeInTheDocument();
    });

    it.each([
      [4, 1],
      [6, 1],
      [8, 1],
      [12, 2],
    ])('shows as many cards as a %i/12 field allows (%i)', (layoutSize, visible) => {
      const assets = [1, 2, 3].map((id) => asset(id, `asset-${id}.png`));
      renderInput({ ...multiple, layoutSize }, { cover: assets });

      expect(screen.getAllByRole('button', { name: /^More actions for/ })).toHaveLength(visible);
      expect(getDropZone()).toBeInTheDocument();
    });

    it.each([
      ['a tablet-sized', 600],
      ['a phone-sized', 400],
    ])('shows one card at a time on %s screen', (_, viewportWidth) => {
      setViewportWidth(viewportWidth);
      const assets = [1, 2, 3].map((id) => asset(id, `asset-${id}.png`));
      renderInput({ ...multiple, layoutSize: 12 }, { cover: assets });

      expect(screen.getAllByRole('button', { name: /^More actions for/ })).toHaveLength(1);
      expect(getDropZone()).toBeInTheDocument();
    });

    describe('on a narrow field', () => {
      const { ResizeObserver: OriginalResizeObserver } = window;

      beforeAll(() => {
        // A third of the form: room for one card, not for a card and the tile.
        window.ResizeObserver = class {
          callback: ResizeObserverCallback;

          constructor(callback: ResizeObserverCallback) {
            this.callback = callback;
          }

          observe() {
            this.callback(
              [{ contentRect: { width: 197 } } as ResizeObserverEntry],
              this as unknown as ResizeObserver
            );
          }

          unobserve() {}

          disconnect() {}
        };
      });

      afterAll(() => {
        window.ResizeObserver = OriginalResizeObserver;
      });

      it('shows one card at a time, with the drop zone below', async () => {
        const { user } = renderInput(multiple, {
          cover: [asset(1, 'one.png'), asset(2, 'two.png')],
        });

        expect(screen.getByText('one.png')).toBeInTheDocument();
        expect(screen.queryByText('two.png')).not.toBeInTheDocument();
        expect(getDropZone()).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Next slide' }));

        expect(screen.getByText('two.png')).toBeInTheDocument();
        expect(screen.queryByText('one.png')).not.toBeInTheDocument();
      });
    });

    it('uploads the files chosen from the hidden picker', async () => {
      renderInput(multiple);

      // eslint-disable-next-line testing-library/no-node-access
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = image('picked.png');

      // jsdom's `files` is a plain stub, so a naive one would not reproduce the
      // browser: there, `files` is live and assigning `value` empties it in place.
      // Wiring the setter to clear the list is what makes this test able to fail.
      const fileList: globalThis.File[] = [file];
      Object.defineProperty(input, 'files', {
        configurable: true,
        get: () => fileList,
      });
      Object.defineProperty(input, 'value', {
        configurable: true,
        get: () => (fileList.length > 0 ? 'C:\\fakepath\\picked.png' : ''),
        // Emptied in place, as the browser does: a handler that kept a reference
        // to the list before the reset now sees it drained.
        set: () => {
          fileList.length = 0;
        },
      });
      fireEvent.change(input);

      await waitFor(() => expect(requests).toHaveLength(1));
      expect(screen.getByText('picked.png')).toBeInTheDocument();
    });
  });

  describe('Add asset menu', () => {
    const openMenu = async (user: ReturnType<typeof renderInput>['user']) => {
      await user.click(screen.getByRole('button', { name: 'Add asset' }));
    };

    it('offers browse and both upload paths when the user can create', async () => {
      const { user } = renderInput({ attribute: { multiple: true } });

      await openMenu(user);

      expect(await screen.findByRole('menuitem', { name: 'Browse library' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Upload from device' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Upload from URL' })).toBeInTheDocument();
    });

    it('offers browse only when the user cannot create', async () => {
      mockPermissions.canCreate = false;
      const { user } = renderInput({ attribute: { multiple: true } });

      await openMenu(user);

      expect(await screen.findByRole('menuitem', { name: 'Browse library' })).toBeInTheDocument();
      expect(
        screen.queryByRole('menuitem', { name: 'Upload from device' })
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: 'Upload from URL' })).not.toBeInTheDocument();
    });

    it('keeps the upload paths while permissions are still loading', async () => {
      // `useRBAC` starts at isLoading with every flag false; reading them then
      // would flash a browse-only menu.
      mockPermissions.isLoading = true;
      mockPermissions.canCreate = false;
      const { user } = renderInput({ attribute: { multiple: true } });

      await openMenu(user);

      expect(
        await screen.findByRole('menuitem', { name: 'Upload from device' })
      ).toBeInTheDocument();
    });

    it('opens the device file picker from "Upload from device"', async () => {
      const clickSpy = jest.spyOn(HTMLInputElement.prototype, 'click');
      const { user } = renderInput({ attribute: { multiple: true } });

      await openMenu(user);
      await user.click(await screen.findByRole('menuitem', { name: 'Upload from device' }));

      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });

    it('opens the URL dialog from "Upload from URL", and uploads to the root', async () => {
      mockUploadFromUrls.mockReturnValue({
        unwrap: () => Promise.resolve({ data: [asset(9, 'from-url.png')], errors: [] }),
      });

      const { user } = renderInput({ attribute: { multiple: true } });

      await openMenu(user);
      await user.click(await screen.findByRole('menuitem', { name: 'Upload from URL' }));

      const urlField = await screen.findByRole('textbox');
      // `fireEvent.change` rather than `user.type`: the textarea is controlled,
      // and one change event is what the component actually reads.
      fireEvent.change(urlField, { target: { value: 'https://example.com/from-url.png' } });
      expect(urlField).toHaveValue('https://example.com/from-url.png');

      const form = screen.getByRole('button', { name: 'Upload' }).closest('form')!;
      // jsdom does not perform implicit form submission from a submit button, so
      // the event the dialog listens for has to be raised directly.
      fireEvent.submit(form);

      await waitFor(() => expect(mockUploadFromUrls).toHaveBeenCalledTimes(1));
      expect(mockUploadFromUrls.mock.calls[0][0]).toMatchObject({
        urls: ['https://example.com/from-url.png'],
        folderId: null,
      });

      expect(await screen.findByText('from-url.png')).toBeInTheDocument();
    });

    it('renders the label unbolded and the chevron in the label colour', () => {
      renderInput({ attribute: { multiple: true } });

      const trigger = screen.getByRole('button', { name: 'Add asset' });

      // The design system paints button icons with its own per-variant
      // "svg path { fill }", so the chevron needs the fill set explicitly or it
      // stays the default grey while the label turns primary.
      const chevron = trigger.querySelector('svg path');
      expect(chevron).not.toBeNull();
      // primary600
      expect(window.getComputedStyle(chevron!).fill).toBe('#4945ff');

      const label = trigger.querySelector('span');
      expect(window.getComputedStyle(label!).fontWeight).toBe('400');
    });

    it('disables the trigger on a disabled field', () => {
      renderInput({ disabled: true, attribute: { multiple: true } });

      expect(screen.getByRole('button', { name: 'Add asset' })).toHaveAttribute(
        'aria-disabled',
        'true'
      );
    });
  });

  it('does not upload when the field is disabled', () => {
    renderInput({ disabled: true, attribute: { multiple: true } });

    dropFiles([image('dropped.png')]);

    expect(mockUploadFileViaXHR).not.toHaveBeenCalled();
  });
});
