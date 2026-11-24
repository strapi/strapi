import { render, screen } from '@strapi/admin/strapi-admin/test';

import { DeleteFolderDialog } from '../components/FolderNav/DeleteFolderDialog';

import type { DeleteFolderMode } from '../components/FolderNav/DeleteFolderDialog';

const renderDialog = ({
  mode = 'withContent',
  counts = { contentTypes: 0, subfolders: 0, preservedContentTypes: 0 },
  conflictingFolderNames = [],
}: {
  mode?: DeleteFolderMode;
  counts?: { contentTypes: number; subfolders: number; preservedContentTypes: number };
  conflictingFolderNames?: string[];
} = {}) => {
  return render(
    <DeleteFolderDialog
      onOpenChange={() => {}}
      onConfirm={() => {}}
      folderName="My folder"
      counts={counts}
      conflictingFolderNames={conflictingFolderNames}
      mode={mode}
      open
    />
  );
};

describe('DeleteFolderDialog', () => {
  it('shows a static title when deleting the folder and its contents', () => {
    renderDialog({ counts: { contentTypes: 2, subfolders: 1, preservedContentTypes: 0 } });

    expect(screen.getByText('Delete folder and contents')).toBeInTheDocument();
  });

  it('pluralizes the content count in the body', () => {
    renderDialog({ counts: { contentTypes: 1, subfolders: 0, preservedContentTypes: 0 } });

    expect(
      screen.getByText(/and its deletable contents \(1 application content type\)/)
    ).toBeInTheDocument();
  });

  it('shows the content count without a subfolder segment when there are no subfolders', () => {
    renderDialog({ counts: { contentTypes: 3, subfolders: 0, preservedContentTypes: 0 } });

    expect(
      screen.getByText(/and its deletable contents \(3 application content types\)/)
    ).toBeInTheDocument();
  });

  it('shows both counts when the folder holds subfolders', () => {
    renderDialog({ counts: { contentTypes: 2, subfolders: 1, preservedContentTypes: 0 } });

    expect(
      screen.getByText(/and its deletable contents \(2 application content types, 1 subfolder\)/)
    ).toBeInTheDocument();
  });

  it('drops the content segment when the subtree holds no content types', () => {
    renderDialog({ counts: { contentTypes: 0, subfolders: 2, preservedContentTypes: 0 } });

    expect(screen.getByText(/and its deletable contents \(2 subfolders\)/)).toBeInTheDocument();
  });

  it('keeps the plain title when deleting the folder only', () => {
    renderDialog({
      mode: 'only',
      counts: { contentTypes: 5, subfolders: 2, preservedContentTypes: 0 },
    });

    expect(screen.getByText('Delete folder')).toBeInTheDocument();
  });

  it('explains how many protected content types will be preserved', () => {
    renderDialog({ counts: { contentTypes: 1, subfolders: 0, preservedContentTypes: 2 } });

    expect(
      screen.getByText('2 protected content types will be preserved and ungrouped.')
    ).toBeInTheDocument();
  });

  it('singularizes the protected content type copy', () => {
    renderDialog({ counts: { contentTypes: 0, subfolders: 0, preservedContentTypes: 1 } });

    expect(
      screen.getByText('1 protected content type will be preserved and ungrouped.')
    ).toBeInTheDocument();
  });

  it('blocks a folder-only deletion and names conflicting folders', () => {
    renderDialog({ mode: 'only', conflictingFolderNames: ['Blog', 'News'] });

    expect(
      screen.getByText(
        'This folder cannot be deleted because these folder names already exist in its destination: Blog, News.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yes, delete' })).toBeDisabled();
  });
});
