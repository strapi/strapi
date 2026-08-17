import { render, screen } from '@strapi/admin/strapi-admin/test';

import { DeleteFolderDialog } from '../components/FolderNav/DeleteFolderDialog';

import type { DeleteFolderMode } from '../components/FolderNav/DeleteFolderDialog';

const renderDialog = ({
  mode = 'withContent',
  counts = { contentTypes: 0, subfolders: 0 },
}: {
  mode?: DeleteFolderMode;
  counts?: { contentTypes: number; subfolders: number };
} = {}) => {
  return render(
    <DeleteFolderDialog
      onOpenChange={() => {}}
      onConfirm={() => {}}
      folderName="My folder"
      counts={counts}
      mode={mode}
      open
    />
  );
};

describe('DeleteFolderDialog', () => {
  it('pluralizes the content count in the title', () => {
    renderDialog({ counts: { contentTypes: 1, subfolders: 0 } });

    expect(screen.getByText('Delete folder and 1 content')).toBeInTheDocument();
  });

  it('shows the content count without a subfolder segment when there are no subfolders', () => {
    renderDialog({ counts: { contentTypes: 3, subfolders: 0 } });

    expect(screen.getByText('Delete folder and 3 contents')).toBeInTheDocument();
  });

  it('shows both counts when the folder holds subfolders', () => {
    renderDialog({ counts: { contentTypes: 2, subfolders: 1 } });

    expect(screen.getByText('Delete folder and 2 contents, 1 subfolder')).toBeInTheDocument();
  });

  it('drops the content segment when the subtree holds no content types', () => {
    renderDialog({ counts: { contentTypes: 0, subfolders: 2 } });

    expect(screen.getByText('Delete folder and 2 subfolders')).toBeInTheDocument();
  });

  it('keeps the plain title when deleting the folder only', () => {
    renderDialog({ mode: 'only', counts: { contentTypes: 5, subfolders: 2 } });

    expect(screen.getByText('Delete folder')).toBeInTheDocument();
  });
});
