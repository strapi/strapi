import { emitAudit } from '@strapi/utils';
import type { Core, Modules } from '@strapi/types';

import type { Settings } from './controllers/validation/admin/settings';

export const AUDITED_EVENTS = {
  UPLOAD_SETTINGS_UPDATE: 'upload-settings.update',
  MEDIA_MOVE: 'media.move',
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
    transform: Modules.AuditLogs.EventTransformer<TDetails>
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
