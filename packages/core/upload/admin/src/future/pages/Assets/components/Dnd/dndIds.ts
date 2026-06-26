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
