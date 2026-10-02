export const DID_ACT_ON_FOLDERS = 'didActOnFolders';

export type FolderAction =
  | 'create'
  | 'rename'
  | 'move'
  | 'deleteOnly'
  | 'deleteSubtree'
  | 'assign'
  | 'reorder';

export type FolderTelemetryOperation = 'create' | 'update' | 'delete';

const OPERATION_BY_ACTION: Record<FolderAction, FolderTelemetryOperation> = {
  create: 'create',
  rename: 'update',
  move: 'update',
  assign: 'update',
  reorder: 'update',
  deleteOnly: 'delete',
  deleteSubtree: 'delete',
};

/** Map a fine-grained folder action to an operation value the telemetry API accepts. */
export const folderTelemetryOperation = (action: FolderAction): FolderTelemetryOperation => {
  return OPERATION_BY_ACTION[action];
};
