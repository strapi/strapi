export interface DragFileData {
  kind: 'file';
  id: number;
  name: string;
  folderId: number | null;
}

export interface DragFolderData {
  kind: 'folder';
  id: number;
  name: string;
  parentId: number | null;
}

export type DragItemData = DragFileData | DragFolderData;

export interface FolderTargetData {
  kind: 'folder-target';
  id: number;
  name: string;
}

export interface FolderTreeTargetData {
  kind: 'folder-tree-target';
  id: number | null;
  name: string;
}

export interface BulkMovePayload {
  fileIds: number[];
  folderIds: number[];
}
