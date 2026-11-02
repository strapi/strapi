import type { File as FormidableFile } from 'formidable';
import type { Data } from '@strapi/types';

export type InputFile = FormidableFile & {
  path?: string;
  tmpWorkingDirectory?: string;
  provider?: string;
};

export interface FocalPoint {
  x: number;
  y: number;
}

/**
 * Admin user that created or updated a file, when the relation is populated
 */
export interface FileCreator {
  id: Data.ID;
  firstname?: string | null;
  lastname?: string | null;
  username?: string | null;
  email?: string;
}

/**
 * A `plugin::upload.file` row, as the upload service returns it
 */
export interface File {
  id: Data.ID;
  documentId: Data.DocumentID;
  name: string;
  alternativeText?: string | null;
  caption?: string | null;
  focalPoint?: FocalPoint | null;
  /**
   * null for non-image files
   */
  width?: number | null;
  /**
   * null for non-image files
   */
  height?: number | null;
  /**
   * null for non-image files
   */
  formats?: Record<string, unknown> | null;
  hash: string;
  ext?: string;
  mime?: string;
  size?: number;
  /**
   * Set on files sent to the provider, never stored on the row
   */
  sizeInBytes?: number;
  url?: string;
  /**
   * Provider-dependent: null with the local provider
   */
  previewUrl?: string | null;
  /**
   * Set on files sent to the provider, never stored on the row
   */
  path?: string | null;
  provider?: string;
  /**
   * Provider-dependent: null with the local provider
   */
  provider_metadata?: Record<string, unknown> | null;
  isUrlSigned?: boolean;
  /**
   * Present only when populated
   */
  folder?: Folder | null;
  folderPath?: string;
  /**
   * Present only when populated: the related entries, with their `__type`
   */
  related?: {
    id: Data.ID;
    __type: string;
  }[];
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  locale?: string | null;
  /**
   * Present only when populated: the admin user, or null when no admin user is set
   */
  createdBy?: Data.ID | FileCreator | null;
  updatedBy?: Data.ID | FileCreator | null;
}

export interface Folder {
  id: Data.ID;
  name: string;
  pathId: number;
  /**
   * parent id, or null when the folder sits at the media library root
   */
  parent?: Data.ID | null;
  /**
   * children ids
   */
  children?: Data.ID[];
  path: string;
  files?: File[];
}

export interface Config {
  provider: string;
  sizeLimit?: number;
  providerOptions: Record<string, unknown>;
  actionOptions: Record<string, unknown>;
  sharp?: {
    cache?: boolean;
    concurrency?: number;
    limitInputPixels?: number | boolean;
  };
  /** Server-side ceiling: files processed in parallel within a single request. */
  concurrentUploadSize?: number;
  /** Client-side parallelism: how many upload requests the admin fires at once. */
  concurrentUploadRequests?: number;
  security?: {
    allowedTypes?: string[];
    deniedTypes?: string[];
  };
}

export interface UploadableFile extends Omit<File, 'id' | 'documentId' | 'folder' | 'related'> {
  folder?: Data.ID | null;
  related?: {
    id: Data.ID;
    __type: string;
    __pivot: { field: string };
  }[];
  filepath?: string;
  getStream: () => NodeJS.ReadableStream;
  stream?: NodeJS.ReadableStream;
  buffer?: Buffer;
  tmpWorkingDirectory?: string;
}

export type FileInfo = {
  name?: string | null;
  alternativeText?: string | null;
  caption?: string | null;
  focalPoint?: FocalPoint | null;
  folder?: Data.ID | null;
};
