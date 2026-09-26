export const toFileDraggableId = (id: number) => `file:${id}` as const;

export const toFolderDraggableId = (id: number) => `folder:${id}` as const;

export const toFolderTargetId = (id: number) => `folder-target:${id}` as const;

export const parseFolderTargetId = (dndId: string | number): number | null => {
  if (typeof dndId !== 'string') {
    return null;
  }

  const match = /^folder-target:(\d+)$/.exec(dndId);
  return match ? Number(match[1]) : null;
};

export const toFolderTreeTargetId = (id: number) => `folder-tree-target:${id}` as const;

export const HOME_TREE_TARGET_ID = 'folder-tree-target:home' as const;

export const parseFolderTreeTargetId = (dndId: string | number): number | 'root' | null => {
  if (typeof dndId !== 'string') {
    return null;
  }

  if (dndId === HOME_TREE_TARGET_ID) {
    return 'root';
  }

  const match = /^folder-tree-target:(\d+)$/.exec(dndId);
  return match ? Number(match[1]) : null;
};
