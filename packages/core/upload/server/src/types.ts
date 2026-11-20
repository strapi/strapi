import type { File as FormidableFile } from 'formidable';

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
  id: number;
  firstname?: string | null;
  lastname?: string | null;
  username?: string | null;
  email?: string;
}

/**
 * A `plugin::upload.file` row, as the upload service returns it
 */
export interface File {
  id: number;
  documentId: string;
  name: string;
  alternativeText?: string | null;
  caption?: string | null;
  focalPoint?: FocalPoint | null;
  /**
   * null for non-image files
   */
  width: number | null;
  /**
   * null for non-image files
   */
  height: number | null;
  /**
   * null or `{}` when the file has no generated formats, e.g. non-image files
   */
  formats: Record<string, unknown> | null;
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
  previewUrl: string | null;
  /**
   * Set on files sent to the provider, never stored on the row
   */
  path?: string | null;
  provider?: string;
  /**
   * Provider-dependent: null with the local provider
   */
  provider_metadata: Record<string, unknown> | null;
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
    id: string | number;
    __type: string;
  }[];
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  locale?: string | null;
  /**
   * Present only when populated: the admin user, or null when no admin user is set
   */
  createdBy?: number | FileCreator | null;
  updatedBy?: number | FileCreator | null;
}

export interface Folder {
  id: number;
  name: string;
  pathId: number;
  /**
   * parent id, or null when the folder sits at the media library root
   */
  parent?: number | null;
  /**
   * children ids
   */
  children?: number[];
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

export interface UploadableFile extends Omit<
  File,
  | 'id'
  | 'documentId'
  | 'folder'
  | 'related'
  | 'width'
  | 'height'
  | 'formats'
  | 'previewUrl'
  | 'provider_metadata'
> {
  width?: number | null;
  height?: number | null;
  formats?: Record<string, unknown> | null;
  previewUrl?: string | null;
  provider_metadata?: Record<string, unknown> | null;
  folder?: number | null;
  related?: {
    id: string | number;
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
  folder?: number | null;
};
