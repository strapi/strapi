import type { Data, Struct, UID } from '@strapi/types';
import { type errors } from '@strapi/utils';

/**
 * Work in progress, not a document: a backup is the form state as-is, so it may be partial or
 * fail validation until its author saves it.
 */
type AutosaveData = object;

/**
 * A per-user backup of uncommitted edits. It is only ever readable by its author and is never
 * part of the shared draft until that author saves or restores it.
 */
export type { AutosaveData };

export interface AutosaveEntry {
  documentId: Data.ID;
  contentType: UID.ContentType;
  locale: string | null;
  data: AutosaveData;
  /**
   * The `updatedAt` the edits were based on, used to detect a stale restore on save.
   */
  baseVersion: string | null;
  savedAt: string;
}

/**
 * Attributes the content type gained (`added`) or lost (`removed`) since the backup was taken.
 * Empty on both sides when the backup still matches the content type.
 */
export interface AutosaveSchemaDiff {
  added: Struct.SchemaAttributes;
  removed: Struct.SchemaAttributes;
}

type ErrorResponse = {
  data?: never;
  error: errors.ApplicationError;
};

/**
 * GET /content-manager/autosaves/:model/:documentId
 */
export declare namespace GetAutosave {
  export interface Request {
    params: {
      model: UID.ContentType;
      documentId: Data.ID;
    };
    query: {
      locale?: string;
    };
  }

  export type Response =
    | {
        data: AutosaveEntry | null;
        /**
         * Only present when a backup was found and the content type has changed since.
         */
        meta?: { unknownAttributes: AutosaveSchemaDiff };
        error?: never;
      }
    | ErrorResponse;
}

/**
 * PUT /content-manager/autosaves/:model/:documentId
 */
export declare namespace SaveAutosave {
  export interface Request {
    params: {
      model: UID.ContentType;
      documentId: Data.ID;
    };
    query: {
      locale?: string;
    };
    body: {
      data: AutosaveData;
      baseVersion?: string;
    };
  }

  export type Response =
    | {
        data: AutosaveEntry;
        error?: never;
      }
    | ErrorResponse;
}

/**
 * DELETE /content-manager/autosaves/:model/:documentId
 */
export declare namespace DeleteAutosave {
  export interface Request {
    params: {
      model: UID.ContentType;
      documentId: Data.ID;
    };
    query: {
      locale?: string;
    };
  }

  export type Response =
    | {
        data: null;
        error?: never;
      }
    | ErrorResponse;
}
