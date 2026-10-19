import { Form } from '@strapi/admin/strapi-admin';
import { render, screen, waitFor, fireEvent, act } from '@tests/utils';

import { MediaLibraryInput } from '../MediaLibraryInput';

import type { File as AssetFile } from '../../../../../shared/contracts/files';

const mockUploadFiles = jest.fn();
const mockUploadFromUrls = jest.fn();

jest.mock('../../../services/api', () => {
  const actual = jest.requireActual('../../../services/api');

  return {
    ...actual,
    useUploadFilesMutation: () => [mockUploadFiles],
    useUploadFromUrlsMutation: () => [mockUploadFromUrls],
  };
});

const mockPermissions = {
  isLoading: false,
  canRead: true,
  canCreate: true,
  canUpdate: true,
  canDownload: true,
  canCopyLink: true,
};

jest.mock('../../../hooks/useMediaLibraryPermissions', () => ({
  useMediaLibraryPermissions: () => mockPermissions,
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

/** Like the mutation: each file reaches `onFileUploaded` once it has uploaded. */
const mockUploadResolving = (files: AssetFile[]) =>
  mockUploadFiles.mockImplementation(({ onFileUploaded }) => ({
    unwrap: async () => {
      files.forEach((file) => onFileUploaded(file));
      return files;
    },
  }));

const renderInput = (
  props: Partial<React.ComponentProps<typeof MediaLibraryInput>> = {},
  initialValues: Record<string, unknown> = {}
) =>
  render(<MediaLibraryInput name="cover" label="Cover" {...props} />, {
    renderOptions: {
      wrapper: ({ children }) => (
        <Form onSubmit={jest.fn()} method="POST" initialValues={initialValues}>
          {children}
        </Form>
      ),
    },
  });

const dropFiles = (files: globalThis.File[]) => {
  const dropZone = screen.getByRole('button', {
    name: /click to add an asset or drag and drop one in this area/i,
  });

  fireEvent.drop(dropZone, {
    dataTransfer: { files, types: ['Files'] },
  });
};

describe('<MediaLibraryInput /> (Content Manager)', () => {
  beforeEach(() => {
    mockUploadFiles.mockReset();
    mockUploadFromUrls.mockReset();
    Object.assign(mockPermissions, { isLoading: false, canRead: true, canCreate: true });
  });

  it('renders the drop zone and one row per asset already on the field', () => {
    renderInput(
      { attribute: { multiple: true } },
      { cover: [asset(1, 'one.png'), asset(2, 'two.png')] }
    );

    expect(
      screen.getByRole('button', {
        name: /click to add an asset or drag and drop one in this area/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText('one.png')).toBeInTheDocument();
    expect(screen.getByText('two.png')).toBeInTheDocument();
  });

  it('uploads a dropped file to the Media Library root and adds it to the field', async () => {
    mockUploadResolving([asset(9, 'dropped.png')]);

    renderInput({ attribute: { multiple: true } });

    dropFiles([new File(['x'], 'dropped.png', { type: 'image/png' })]);

    await waitFor(() => expect(mockUploadFiles).toHaveBeenCalledTimes(1));

    const { formData, totalFiles } = mockUploadFiles.mock.calls[0][0];
    expect(totalFiles).toBe(1);

    const fileInfo = JSON.parse(formData.get('fileInfo') as string);
    // No current folder in an entry form: uploads land at the root.
    expect(fileInfo).toEqual([
      { name: 'dropped.png', caption: null, alternativeText: null, folder: null },
    ]);

    expect(await screen.findByText('dropped.png')).toBeInTheDocument();
  });

  it('keeps the assets already on the field when another one is uploaded', async () => {
    mockUploadResolving([asset(9, 'dropped.png')]);

    renderInput({ attribute: { multiple: true } }, { cover: [asset(1, 'one.png')] });

    dropFiles([new File(['x'], 'dropped.png', { type: 'image/png' })]);

    expect(await screen.findByText('dropped.png')).toBeInTheDocument();
    expect(screen.getByText('one.png')).toBeInTheDocument();
  });

  it('refuses a file the field does not allow, and uploads nothing', async () => {
    renderInput({ attribute: { multiple: true, allowedTypes: ['images'] } });

    dropFiles([new File(['x'], 'notes.pdf', { type: 'application/pdf' })]);

    expect(await screen.findByText(/You can't upload this type of file/)).toBeInTheDocument();
    expect(mockUploadFiles).not.toHaveBeenCalled();
  });

  it('uploads the allowed files of a mixed drop and warns about the rest', async () => {
    mockUploadResolving([asset(9, 'photo.png')]);

    renderInput({ attribute: { multiple: true, allowedTypes: ['images'] } });

    dropFiles([
      new File(['x'], 'photo.png', { type: 'image/png' }),
      new File(['x'], 'notes.pdf', { type: 'application/pdf' }),
    ]);

    await waitFor(() => expect(mockUploadFiles).toHaveBeenCalledTimes(1));

    const fileInfo = JSON.parse(
      mockUploadFiles.mock.calls[0][0].formData.get('fileInfo') as string
    );
    expect(fileInfo).toHaveLength(1);
    expect(fileInfo[0].name).toBe('photo.png');

    expect(await screen.findByText(/You can't upload this type of file/)).toBeInTheDocument();
  });

  it('keeps both batches when a second drop lands while the first is still uploading', async () => {
    mockUploadFiles.mockReturnValue({ unwrap: () => new Promise(() => {}) });

    renderInput({ attribute: { multiple: true } });

    dropFiles([new File(['x'], 'first.png', { type: 'image/png' })]);
    dropFiles([new File(['x'], 'second.png', { type: 'image/png' })]);

    await waitFor(() => expect(mockUploadFiles).toHaveBeenCalledTimes(2));

    const [[firstCall], [secondCall]] = mockUploadFiles.mock.calls;
    await act(async () => {
      firstCall.onFileUploaded(asset(1, 'first.png'));
    });
    await act(async () => {
      secondCall.onFileUploaded(asset(2, 'second.png'));
    });

    expect(await screen.findByText('second.png')).toBeInTheDocument();
    expect(screen.getByText('first.png')).toBeInTheDocument();
  });

  it('keeps every file when several finish before the field re-renders', async () => {
    mockUploadFiles.mockReturnValue({ unwrap: () => new Promise(() => {}) });

    renderInput({ attribute: { multiple: true } });

    dropFiles([
      new File(['x'], 'one.png', { type: 'image/png' }),
      new File(['x'], 'two.png', { type: 'image/png' }),
    ]);

    await waitFor(() => expect(mockUploadFiles).toHaveBeenCalledTimes(1));

    const { onFileUploaded } = mockUploadFiles.mock.calls[0][0];
    await act(async () => {
      onFileUploaded(asset(1, 'one.png'));
      onFileUploaded(asset(2, 'two.png'));
    });

    expect(await screen.findByText('two.png')).toBeInTheDocument();
    expect(screen.getByText('one.png')).toBeInTheDocument();
  });

  it('adds files a retry uploads after the upload call has resolved', async () => {
    // Cancel all: the call resolves with only the file that finished before it.
    mockUploadResolving([asset(1, 'a.png')]);

    renderInput({ attribute: { multiple: true } });

    dropFiles([
      new File(['x'], 'a.png', { type: 'image/png' }),
      new File(['x'], 'b.png', { type: 'image/png' }),
      new File(['x'], 'c.png', { type: 'image/png' }),
    ]);

    expect(await screen.findByText('a.png')).toBeInTheDocument();

    // Retry, from the progress dialog, uploads the cancelled files later.
    const { onFileUploaded } = mockUploadFiles.mock.calls[0][0];
    await act(async () => {
      onFileUploaded(asset(2, 'b.png'));
      onFileUploaded(asset(3, 'c.png'));
    });

    expect(await screen.findByText('c.png')).toBeInTheDocument();
    expect(screen.getByText('b.png')).toBeInTheDocument();
    expect(screen.getByText('a.png')).toBeInTheDocument();
  });

  it('adds nothing when the upload resolves with no file', async () => {
    mockUploadResolving([]);

    renderInput({ attribute: { multiple: true } });

    dropFiles([new File(['x'], 'cancelled.png', { type: 'image/png' })]);

    await waitFor(() => expect(mockUploadFiles).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('cancelled.png')).not.toBeInTheDocument();
  });

  it('refuses a multi-file drop on a single-value field, and uploads nothing', async () => {
    renderInput({ attribute: { multiple: false } });

    dropFiles([
      new File(['x'], 'one.png', { type: 'image/png' }),
      new File(['x'], 'two.png', { type: 'image/png' }),
    ]);

    expect(await screen.findByText('This field accepts only one file.')).toBeInTheDocument();
    expect(mockUploadFiles).not.toHaveBeenCalled();
  });

  it('still uploads a single-file drop on a single-value field', async () => {
    mockUploadResolving([asset(9, 'only.png')]);

    renderInput({ attribute: { multiple: false } });

    dropFiles([new File(['x'], 'only.png', { type: 'image/png' })]);

    await waitFor(() => expect(mockUploadFiles).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('only.png')).toBeInTheDocument();
  });

  it('allows a multi-file drop on a multiple field', async () => {
    mockUploadResolving([asset(1, 'one.png'), asset(2, 'two.png')]);

    renderInput({ attribute: { multiple: true } });

    dropFiles([
      new File(['x'], 'one.png', { type: 'image/png' }),
      new File(['x'], 'two.png', { type: 'image/png' }),
    ]);

    await waitFor(() => expect(mockUploadFiles).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('This field accepts only one file.')).not.toBeInTheDocument();
  });

  it('replaces the asset on a single-value field', async () => {
    mockUploadResolving([asset(9, 'new.png')]);

    renderInput({ attribute: { multiple: false } }, { cover: asset(1, 'old.png') });

    dropFiles([new File(['x'], 'new.png', { type: 'image/png' })]);

    expect(await screen.findByText('new.png')).toBeInTheDocument();
    expect(screen.queryByText('old.png')).not.toBeInTheDocument();
  });

  it('removes an asset from the field', async () => {
    const { user } = renderInput(
      { attribute: { multiple: true } },
      { cover: [asset(1, 'one.png'), asset(2, 'two.png')] }
    );

    await user.click(screen.getByRole('button', { name: 'Remove one.png' }));

    expect(screen.queryByText('one.png')).not.toBeInTheDocument();
    expect(screen.getByText('two.png')).toBeInTheDocument();
  });

  it('copies the link to an asset', async () => {
    const { user } = renderInput({}, { cover: asset(1, 'one.png') });

    await user.click(screen.getByRole('button', { name: 'Copy link to one.png' }));

    expect(await screen.findByText('Link copied.')).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toMatch(/\/uploads\/one\.png$/);
  });

  it('opens the asset details when editing an asset', async () => {
    const { user } = renderInput({}, { cover: asset(1, 'one.png') });

    await user.click(screen.getByRole('button', { name: 'Edit one.png' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('does not allow editing or removing an asset when the field is disabled', () => {
    renderInput({ disabled: true }, { cover: asset(1, 'one.png') });

    expect(screen.getByRole('button', { name: 'Edit one.png' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Remove one.png' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Copy link to one.png' })).not.toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  describe('without read access to the Media Library', () => {
    beforeEach(() => {
      mockPermissions.canRead = false;
    });

    it('does not offer to edit an asset', () => {
      renderInput({}, { cover: asset(1, 'one.png') });

      expect(screen.queryByRole('button', { name: 'Edit one.png' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remove one.png' })).toBeInTheDocument();
    });

    it('opens the device picker instead of the library when the drop zone is clicked', async () => {
      const click = jest.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
      const { user } = renderInput();

      await user.click(
        screen.getByRole('button', {
          name: /click to add an asset or drag and drop one in this area/i,
        })
      );

      expect(click).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      click.mockRestore();
    });

    it('explains the missing access on click without upload access either', async () => {
      mockPermissions.canCreate = false;
      const click = jest.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
      const { user } = renderInput();

      await user.click(
        screen.getByRole('button', {
          name: /click to add an asset or drag and drop one in this area/i,
        })
      );

      expect(click).not.toHaveBeenCalled();
      expect(await screen.findByRole('dialog')).toHaveTextContent(
        "You don't have the permissions to access that content"
      );

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      click.mockRestore();
    });
  });

  it('uploads the files chosen from the hidden picker', async () => {
    mockUploadResolving([asset(9, 'picked.png')]);

    renderInput({ attribute: { multiple: true } });

    // eslint-disable-next-line testing-library/no-node-access
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'picked.png', { type: 'image/png' });

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

    await waitFor(() => expect(mockUploadFiles).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('picked.png')).toBeInTheDocument();
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

    it('offers upload only when the user cannot read the Media Library', async () => {
      mockPermissions.canRead = false;
      const { user } = renderInput({ attribute: { multiple: true } });

      await openMenu(user);

      expect(
        await screen.findByRole('menuitem', { name: 'Upload from device' })
      ).toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: 'Browse library' })).not.toBeInTheDocument();
    });

    it('hides the trigger when the user can neither read nor create', () => {
      mockPermissions.canRead = false;
      mockPermissions.canCreate = false;
      renderInput({ attribute: { multiple: true } });

      expect(screen.queryByRole('button', { name: 'Add asset' })).not.toBeInTheDocument();
    });

    it('shows every entry disabled while permissions are still loading', async () => {
      // `useRBAC` starts at isLoading with every flag false.
      mockPermissions.isLoading = true;
      mockPermissions.canRead = false;
      mockPermissions.canCreate = false;
      const { user } = renderInput({ attribute: { multiple: true } });

      await openMenu(user);

      for (const name of ['Browse library', 'Upload from device', 'Upload from URL']) {
        // eslint-disable-next-line no-await-in-loop
        expect(await screen.findByRole('menuitem', { name })).toHaveAttribute(
          'aria-disabled',
          'true'
        );
      }
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

      const trigger = screen.getByRole('button', { name: 'Add asset' });
      expect(trigger).toHaveAttribute('aria-disabled', 'true');

      // Still a greyed-out link, not the design system's grey button.
      const style = window.getComputedStyle(trigger);
      expect(style.backgroundColor).toBe('transparent');
      expect(style.borderColor).toBe('transparent');
    });

    it('says a URL file the field does not accept was added to the library', async () => {
      mockUploadFromUrls.mockReturnValue({
        unwrap: () =>
          Promise.resolve({
            data: [asset(9, 'photo.png'), { ...asset(10, 'notes.pdf'), mime: 'application/pdf' }],
            errors: [],
          }),
      });

      const { user } = renderInput({ attribute: { multiple: true, allowedTypes: ['images'] } });

      await openMenu(user);
      await user.click(await screen.findByRole('menuitem', { name: 'Upload from URL' }));
      fireEvent.change(await screen.findByRole('textbox'), {
        target: { value: 'https://example.com/photo.png\nhttps://example.com/notes.pdf' },
      });
      fireEvent.submit(screen.getByRole('button', { name: 'Upload' }).closest('form')!);

      expect(
        await screen.findByText(
          'notes.pdf was added to the Media Library, but this field only accepts images.'
        )
      ).toBeInTheDocument();
      expect(screen.getByText('photo.png')).toBeInTheDocument();
      expect(screen.queryByText(/You can't upload this type of file/)).not.toBeInTheDocument();
    });
  });

  it('does not upload when the field is disabled', () => {
    renderInput({ disabled: true, attribute: { multiple: true } });

    dropFiles([new File(['x'], 'dropped.png', { type: 'image/png' })]);

    expect(mockUploadFiles).not.toHaveBeenCalled();
  });
});
