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
    mockPermissions.isLoading = false;
    mockPermissions.canCreate = true;
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
    mockUploadFiles.mockReturnValue({
      unwrap: () => Promise.resolve([asset(9, 'dropped.png')]),
    });

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
    mockUploadFiles.mockReturnValue({
      unwrap: () => Promise.resolve([asset(9, 'dropped.png')]),
    });

    renderInput({ attribute: { multiple: true } }, { cover: [asset(1, 'one.png')] });

    dropFiles([new File(['x'], 'dropped.png', { type: 'image/png' })]);

    expect(await screen.findByText('dropped.png')).toBeInTheDocument();
    expect(screen.getByText('one.png')).toBeInTheDocument();
  });

  it('refuses a file the field does not allow, and uploads nothing', async () => {
    renderInput({ attribute: { multiple: true, allowedTypes: ['images'] } });

    dropFiles([new File(['x'], 'notes.pdf', { type: 'application/pdf' })]);

    expect(await screen.findByText(`You can't upload this type of file.`)).toBeInTheDocument();
    expect(mockUploadFiles).not.toHaveBeenCalled();
  });

  it('uploads the allowed files of a mixed drop and warns about the rest', async () => {
    mockUploadFiles.mockReturnValue({
      unwrap: () => Promise.resolve([asset(9, 'photo.png')]),
    });

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

    expect(await screen.findByText(`You can't upload this type of file.`)).toBeInTheDocument();
  });

  it('keeps both batches when a second drop lands while the first is still uploading', async () => {
    const deferred = () => {
      let resolve!: (files: AssetFile[]) => void;
      const promise = new Promise<AssetFile[]>((res) => {
        resolve = res;
      });
      return { promise, resolve };
    };

    const first = deferred();
    const second = deferred();
    mockUploadFiles
      .mockReturnValueOnce({ unwrap: () => first.promise })
      .mockReturnValueOnce({ unwrap: () => second.promise });

    renderInput({ attribute: { multiple: true } });

    dropFiles([new File(['x'], 'first.png', { type: 'image/png' })]);
    dropFiles([new File(['x'], 'second.png', { type: 'image/png' })]);

    await waitFor(() => expect(mockUploadFiles).toHaveBeenCalledTimes(2));

    await act(async () => {
      first.resolve([asset(1, 'first.png')]);
    });
    await act(async () => {
      second.resolve([asset(2, 'second.png')]);
    });

    expect(await screen.findByText('second.png')).toBeInTheDocument();
    expect(screen.getByText('first.png')).toBeInTheDocument();
  });

  it('adds nothing when the upload resolves with no file', async () => {
    mockUploadFiles.mockReturnValue({ unwrap: () => Promise.resolve([]) });

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
    mockUploadFiles.mockReturnValue({
      unwrap: () => Promise.resolve([asset(9, 'only.png')]),
    });

    renderInput({ attribute: { multiple: false } });

    dropFiles([new File(['x'], 'only.png', { type: 'image/png' })]);

    await waitFor(() => expect(mockUploadFiles).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('only.png')).toBeInTheDocument();
  });

  it('allows a multi-file drop on a multiple field', async () => {
    mockUploadFiles.mockReturnValue({
      unwrap: () => Promise.resolve([asset(1, 'one.png'), asset(2, 'two.png')]),
    });

    renderInput({ attribute: { multiple: true } });

    dropFiles([
      new File(['x'], 'one.png', { type: 'image/png' }),
      new File(['x'], 'two.png', { type: 'image/png' }),
    ]);

    await waitFor(() => expect(mockUploadFiles).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('This field accepts only one file.')).not.toBeInTheDocument();
  });

  it('replaces the asset on a single-value field', async () => {
    mockUploadFiles.mockReturnValue({
      unwrap: () => Promise.resolve([asset(9, 'new.png')]),
    });

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

    dropFiles([new File(['x'], 'dropped.png', { type: 'image/png' })]);

    expect(mockUploadFiles).not.toHaveBeenCalled();
  });
});
