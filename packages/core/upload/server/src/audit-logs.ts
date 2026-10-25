import { emitAudit } from '@strapi/utils';
import type { Core, Modules } from '@strapi/types';

import type { Settings } from './controllers/validation/admin/settings';

export const AUDITED_EVENTS = {
  UPLOAD_SETTINGS_UPDATE: 'upload-settings.update',
  MEDIA_CREATE: 'media.create',
  MEDIA_UPDATE: 'media.update',
  MEDIA_DELETE: 'media.delete',
  MEDIA_MOVE: 'media.move',
  FOLDER_CREATE: 'media-folder.create',
  FOLDER_UPDATE: 'media-folder.update',
  // Audit-only events. media.update is a webhook event that carries neither the file as it was
  // nor its folder; media-folder.delete carries every deleted folder in one event.
  MEDIA_UPDATE_AUDIT: 'media.update.audit',
  FOLDER_DELETE_AUDIT: 'media-folder.delete.audit',
} as const;

const AUDITED_SETTINGS = [
  'sizeOptimization',
  'responsiveDimensions',
  'autoOrientation',
  'aiMetadata',
] as const;

export type UploadSettingsChanges = Partial<
  Record<(typeof AUDITED_SETTINGS)[number], Modules.AuditLogs.FieldChange<boolean | null>>
>;

export interface SettingsUpdateDetails {
  changes: UploadSettingsChanges;
}

// The store replaces the whole value, so an option missing from the request is removed and recorded as null.
export const getUploadSettingsChanges = (
  previous: Partial<Settings> | null,
  next: Partial<Settings>
): UploadSettingsChanges => {
  const changes: UploadSettingsChanges = {};

  for (const setting of AUDITED_SETTINGS) {
    const before = previous?.[setting] ?? null;
    const after = next[setting] ?? null;

    if (before !== after) {
      changes[setting] = { before, after };
    }
  }

  return changes;
};

interface FolderRef {
  id: number;
  name: string | null;
}

export interface MediaMoveEvent {
  kind: 'file' | 'folder';
  id: number;
  name: string;
  from: FolderRef | null;
  to: FolderRef | null;
}

export interface MoveDetails {
  from: FolderRef | null;
  to: FolderRef | null;
}

const toFolderRef = (folder: { id: number | string; name?: string | null } | null | undefined) =>
  folder ? { id: Number(folder.id), name: folder.name ?? null } : null;

interface MediaFile {
  id: number;
  name: string;
  mime?: string;
  size?: number;
  alternativeText?: string | null;
  caption?: string | null;
  focalPoint?: { x: number; y: number } | null;
  folder?: { id: number; name: string | null } | null;
}

/** The payload of media.create and media.delete, which are also webhook events. */
export interface MediaEvent {
  media: MediaFile;
}

export interface MediaUpdateEvent {
  file: MediaFile;
  previous: MediaFile;
  /** The file's content was replaced. It keeps its hash and url, so no field shows it. */
  replaced?: boolean;
}

/** Picks the fields the audit log compares. */
export const toAuditedFile = (file: Record<string, any>): MediaFile => ({
  id: Number(file.id),
  name: file.name,
  mime: file.mime,
  size: file.size,
  alternativeText: file.alternativeText ?? null,
  caption: file.caption ?? null,
  focalPoint: file.focalPoint ?? null,
  folder: toFolderRef(file.folder),
});

interface FileSummary {
  name: string;
  mime: string | null;
  size: number | null;
}

export interface MediaChanges {
  name?: Modules.AuditLogs.FieldChange<string>;
  alternativeText?: Modules.AuditLogs.FieldChange<string | null>;
  caption?: Modules.AuditLogs.FieldChange<string | null>;
  focalPoint?: Modules.AuditLogs.FieldChange<{ x: number; y: number } | null>;
  folder?: Modules.AuditLogs.FieldChange<FolderRef | null>;
  file?: Modules.AuditLogs.FieldChange<FileSummary>;
}

const summarizeFile = (file: MediaFile): FileSummary => ({
  name: file.name,
  mime: file.mime ?? null,
  size: file.size ?? null,
});

export const getMediaChanges = ({
  file: media,
  previous,
  replaced,
}: MediaUpdateEvent): MediaChanges => {
  const changes: MediaChanges = {};

  if (previous.name !== media.name) {
    changes.name = { before: previous.name, after: media.name };
  }

  for (const field of ['alternativeText', 'caption'] as const) {
    const before = previous[field] ?? null;
    const after = media[field] ?? null;
    if (before !== after) {
      changes[field] = { before, after };
    }
  }

  const focalBefore = previous.focalPoint ?? null;
  const focalAfter = media.focalPoint ?? null;
  if (JSON.stringify(focalBefore) !== JSON.stringify(focalAfter)) {
    changes.focalPoint = { before: focalBefore, after: focalAfter };
  }

  const folderBefore = toFolderRef(previous.folder);
  const folderAfter = toFolderRef(media.folder);
  if ((folderBefore?.id ?? null) !== (folderAfter?.id ?? null)) {
    changes.folder = { before: folderBefore, after: folderAfter };
  }

  if (replaced) {
    changes.file = { before: summarizeFile(previous), after: summarizeFile(media) };
  }

  return changes;
};

interface MediaFolder {
  id: number;
  name: string;
  parent?: { id: number; name: string | null } | null;
}

/** The payload of the media-folder.* events. They are not webhook events. */
export interface FolderEvent {
  folder: MediaFolder;
  previous?: MediaFolder;
}

export interface FolderChanges {
  name?: Modules.AuditLogs.FieldChange<string>;
  parent?: Modules.AuditLogs.FieldChange<FolderRef | null>;
}

export const getFolderChanges = ({ folder, previous }: FolderEvent): FolderChanges => {
  if (!previous) {
    return {};
  }

  const changes: FolderChanges = {};

  if (previous.name !== folder.name) {
    changes.name = { before: previous.name, after: folder.name };
  }

  const parentBefore = toFolderRef(previous.parent);
  const parentAfter = toFolderRef(folder.parent);
  if ((parentBefore?.id ?? null) !== (parentAfter?.id ?? null)) {
    changes.parent = { before: parentBefore, after: parentAfter };
  }

  return changes;
};

interface JoinTable {
  name: string;
  joinColumn: { name: string };
  inverseJoinColumn: { name: string };
}

/** Reads rows of a table inside the move transaction. */
type ReadTable = (table: string | undefined) => {
  select(...columns: string[]): {
    whereIn(column: string, values: readonly number[]): PromiseLike<Record<string, any>[]>;
  };
};

const readParents = async (read: ReadTable, joinTable: JoinTable, ids: number[]) => {
  if (ids.length === 0) {
    return new Map<number, number>();
  }

  const { joinColumn, inverseJoinColumn } = joinTable;
  const rows = await read(joinTable.name)
    .select(joinColumn.name, inverseJoinColumn.name)
    .whereIn(joinColumn.name, ids);

  return new Map(
    rows.map((row) => [Number(row[joinColumn.name]), Number(row[inverseJoinColumn.name])])
  );
};

export const readMediaMoves = async (
  read: ReadTable,
  {
    files,
    folders,
    destinationFolderId,
    fileFolderJoinTable,
    folderParentJoinTable,
    folderTable,
  }: {
    files: Array<{ id: number | string; name: string }>;
    folders: Array<{ id: number | string; name: string }>;
    destinationFolderId: number | string | null;
    fileFolderJoinTable: JoinTable;
    folderParentJoinTable: JoinTable;
    folderTable: string | undefined;
  }
): Promise<MediaMoveEvent[]> => {
  const fileParents = await readParents(
    read,
    fileFolderJoinTable,
    files.map((file) => Number(file.id))
  );
  const folderParents = await readParents(
    read,
    folderParentJoinTable,
    folders.map((folder) => Number(folder.id))
  );

  const destinationId = destinationFolderId === null ? null : Number(destinationFolderId);
  const referencedIds = new Set([...fileParents.values(), ...folderParents.values()]);
  if (destinationId !== null) {
    referencedIds.add(destinationId);
  }

  const folderNames = new Map<number, string | null>();
  if (referencedIds.size > 0) {
    const rows = await read(folderTable)
      .select('id', 'name')
      .whereIn('id', [...referencedIds]);
    rows.forEach((row) => folderNames.set(Number(row.id), row.name ?? null));
  }

  const toRef = (id: number | null | undefined): FolderRef | null =>
    id == null ? null : { id, name: folderNames.get(id) ?? null };

  const to = toRef(destinationId);

  return [
    ...files.map((file) => ({
      kind: 'file' as const,
      id: Number(file.id),
      name: file.name,
      from: toRef(fileParents.get(Number(file.id))),
      to,
    })),
    ...folders.map((folder) => ({
      kind: 'folder' as const,
      id: Number(folder.id),
      name: folder.name,
      from: toRef(folderParents.get(Number(folder.id))),
      to,
    })),
  ];
};

export const emitMediaMoves = async (
  { strapi }: { strapi: Core.Strapi },
  moves: MediaMoveEvent[]
) => {
  for (const move of moves) {
    if ((move.from?.id ?? null) !== (move.to?.id ?? null)) {
      await emitAudit({ strapi }, AUDITED_EVENTS.MEDIA_MOVE, move);
    }
  }
};

/**
 * The part of the audit-logs lifecycle service used by this plugin.
 * The full service type lives in the Admin EE package and cannot be imported here.
 */
interface AuditLogsLifecycle {
  registerEvent<TDetails>(
    name: string,
    transform: Modules.AuditLogs.EventTransformer<TDetails>,
    options?: { action?: string; shouldRecord?: (...args: any[]) => boolean }
  ): void;
}

export const registerAuditEvents = (auditLogsLifecycle: AuditLogsLifecycle) => {
  auditLogsLifecycle.registerEvent<SettingsUpdateDetails>(
    AUDITED_EVENTS.UPLOAD_SETTINGS_UPDATE,
    (event: SettingsUpdateDetails) => ({
      resource: { type: 'upload-settings' },
      details: { changes: event.changes },
    })
  );

  const fileResource = (file: MediaFile) => ({
    type: 'media',
    id: Number(file.id),
    name: file.name,
  });
  const folderResource = (folder: MediaFolder) => ({
    type: 'media-folder',
    id: Number(folder.id),
    name: folder.name,
  });

  auditLogsLifecycle.registerEvent<{ mime: string | null; size: number | null }>(
    AUDITED_EVENTS.MEDIA_CREATE,
    ({ media }: MediaEvent) => ({
      resource: fileResource(media),
      details: { mime: media.mime ?? null, size: media.size ?? null },
    })
  );

  auditLogsLifecycle.registerEvent<{ changes: MediaChanges }>(
    AUDITED_EVENTS.MEDIA_UPDATE_AUDIT,
    (event: MediaUpdateEvent) => ({
      resource: fileResource(event.file),
      details: { changes: getMediaChanges(event) },
    }),
    {
      action: AUDITED_EVENTS.MEDIA_UPDATE,
      shouldRecord: (event: MediaUpdateEvent) => Object.keys(getMediaChanges(event)).length > 0,
    }
  );

  auditLogsLifecycle.registerEvent(AUDITED_EVENTS.MEDIA_DELETE, ({ media }: MediaEvent) => ({
    resource: fileResource(media),
  }));

  // Folders are recorded under the media.* actions: the resource type tells them apart
  auditLogsLifecycle.registerEvent(
    AUDITED_EVENTS.FOLDER_CREATE,
    ({ folder }: FolderEvent) => ({ resource: folderResource(folder) }),
    { action: AUDITED_EVENTS.MEDIA_CREATE }
  );

  auditLogsLifecycle.registerEvent<{ changes: FolderChanges }>(
    AUDITED_EVENTS.FOLDER_UPDATE,
    (event: FolderEvent) => ({
      resource: folderResource(event.folder),
      details: { changes: getFolderChanges(event) },
    }),
    {
      action: AUDITED_EVENTS.MEDIA_UPDATE,
      shouldRecord: (event: FolderEvent) => Object.keys(getFolderChanges(event)).length > 0,
    }
  );

  auditLogsLifecycle.registerEvent(
    AUDITED_EVENTS.FOLDER_DELETE_AUDIT,
    ({ folder }: FolderEvent) => ({ resource: folderResource(folder) }),
    { action: AUDITED_EVENTS.MEDIA_DELETE }
  );

  auditLogsLifecycle.registerEvent<MoveDetails>(
    AUDITED_EVENTS.MEDIA_MOVE,
    (event: MediaMoveEvent) => ({
      resource: {
        type: event.kind === 'file' ? 'media' : 'media-folder',
        id: event.id,
        name: event.name,
      },
      details: { from: event.from, to: event.to },
    })
  );
};
