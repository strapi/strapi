import { fireEvent, render, screen, waitFor } from '@tests/utils';

import { EditorFileDropZone } from '../EditorFileDropZone';

import type { File as AssetFile } from '../../../../../shared/contracts/files';

const mockUploadFiles = jest.fn();

jest.mock('../../../services/api', () => {
  const actual = jest.requireActual('../../../services/api');

  return { ...actual, useUploadFilesMutation: () => [mockUploadFiles] };
});

const mockPermissions = { isLoading: false, canRead: true, canCreate: true };

jest.mock('../../../hooks/useMediaLibraryPermissions', () => ({
  useMediaLibraryPermissions: () => mockPermissions,
}));

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

const image = (name: string) => new File(['x'], name, { type: 'image/png' });

const renderZone = (onDropFiles = jest.fn(() => jest.fn())) => {
  render(
    <EditorFileDropZone allowedTypes={['images']} onDropFiles={onDropFiles}>
      <p>Editor content</p>
    </EditorFileDropZone>
  );

  return { onDropFiles, content: screen.getByText('Editor content') };
};

const filesTransfer = (files: globalThis.File[]) => ({
  dataTransfer: { files, types: ['Files'], dropEffect: 'none' },
});

describe('<EditorFileDropZone />', () => {
  beforeEach(() => {
    mockUploadFiles.mockReset();
    Object.assign(mockPermissions, { isLoading: false, canRead: true, canCreate: true });
  });

  it('highlights the editor while files are dragged over it', () => {
    const { content } = renderZone();

    fireEvent.dragEnter(content, filesTransfer([image('a.png')]));

    expect(screen.getByText('Drop to upload and insert')).toBeInTheDocument();

    fireEvent.dragLeave(content, filesTransfer([image('a.png')]));

    expect(screen.queryByText('Drop to upload and insert')).not.toBeInTheDocument();
  });

  it('ignores drags that carry no file, such as a block being moved', () => {
    const { content } = renderZone();

    fireEvent.dragEnter(content, { dataTransfer: { files: [], types: ['text/plain'] } });

    expect(screen.queryByTestId('editor-file-drop-zone')).not.toBeInTheDocument();
  });

  it('uploads every dropped image to the Media Library root and hands each one back', async () => {
    const onFileUploaded = jest.fn();
    const uploaded = [asset(1, 'one.png'), asset(2, 'two.png')];
    mockUploadResolving(uploaded);
    const { content, onDropFiles } = renderZone(jest.fn(() => onFileUploaded));

    fireEvent.drop(content, filesTransfer([image('one.png'), image('two.png')]));

    await waitFor(() => expect(onFileUploaded).toHaveBeenCalledTimes(2));
    expect(onDropFiles).toHaveBeenCalledTimes(1);
    expect(onFileUploaded).toHaveBeenNthCalledWith(1, uploaded[0]);
    expect(onFileUploaded).toHaveBeenNthCalledWith(2, uploaded[1]);

    const { formData, totalFiles } = mockUploadFiles.mock.calls[0][0];
    expect(totalFiles).toBe(2);
    expect(JSON.parse(formData.get('fileInfo') as string)).toEqual([
      { name: 'one.png', caption: null, alternativeText: null, folder: null },
      { name: 'two.png', caption: null, alternativeText: null, folder: null },
    ]);
  });

  it('only uploads the allowed types and says why the rest was left out', async () => {
    mockUploadResolving([asset(1, 'one.png')]);
    const { content } = renderZone();

    fireEvent.drop(
      content,
      filesTransfer([image('one.png'), new File(['x'], 'notes.pdf', { type: 'application/pdf' })])
    );

    await waitFor(() => expect(mockUploadFiles).toHaveBeenCalledTimes(1));
    expect(mockUploadFiles.mock.calls[0][0].totalFiles).toBe(1);
    expect(await screen.findByText(/You can't upload this type of file/)).toBeInTheDocument();
  });

  it('uploads nothing when no dropped file is allowed', async () => {
    const { content, onDropFiles } = renderZone();

    fireEvent.drop(
      content,
      filesTransfer([new File(['x'], 'notes.pdf', { type: 'application/pdf' })])
    );

    expect(await screen.findByText(/You can't upload this type of file/)).toBeInTheDocument();
    expect(onDropFiles).not.toHaveBeenCalled();
    expect(mockUploadFiles).not.toHaveBeenCalled();
  });

  it('refuses the drop without the permission to upload', () => {
    mockPermissions.canCreate = false;
    const { content, onDropFiles } = renderZone();
    const dragOver = filesTransfer([image('one.png')]);

    fireEvent.dragEnter(content, dragOver);
    expect(screen.getByText("You don't have permission to upload files")).toBeInTheDocument();

    fireEvent.dragOver(content, dragOver);
    expect(dragOver.dataTransfer.dropEffect).toBe('none');

    fireEvent.drop(content, filesTransfer([image('one.png')]));
    expect(onDropFiles).not.toHaveBeenCalled();
    expect(mockUploadFiles).not.toHaveBeenCalled();
  });
});
