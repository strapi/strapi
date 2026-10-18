import type { Readable } from 'node:stream';
import type { Providers } from '@strapi/types';

/**
 * A file that enters the upload pipeline: a multipart part parsed by formidable,
 * or a file fetched from a URL (`fetchUrlToInputFile`). Its content sits in a
 * temporary file at `filepath`.
 *
 * This is not formidable's `File` type, because:
 * - files fetched from a URL go through the same pipeline and are not formidable
 *   files (they lack `newFilename`, `hashAlgorithm`, `toJSON`, ...);
 * - the pipeline only reads the fields listed here.
 *
 * A formidable `File` still matches this type structurally.
 */
export interface InputFile {
  filepath: string;
  originalFilename?: string | null;
  mimetype?: string | null;
  /**
   * Size in bytes.
   */
  size: number;
  tmpWorkingDirectory?: string;
  /**
   * Set by the upload security check from the file content.
   */
  detectedMimeType?: string;
}

export interface FocalPoint {
  x: number;
  y: number;
}

/**
 * One entry of a file's `formats`: a thumbnail or a responsive size of an image.
 * Stored as JSON in the file row.
 */
export interface FileFormat {
  name: string;
  hash: string;
  ext?: string;
  mime: string;
  path?: string | null;
  width?: number | null;
  height?: number | null;
  /**
   * Size in kilobytes.
   */
  size: number;
  sizeInBytes?: number;
  url: string;
  provider_metadata?: Record<string, unknown> | null;
  /**
   * Set on the signed copy the upload plugin returns, never stored.
   */
  isUrlSigned?: boolean;
}

/**
 * A row of the `plugin::upload.file` content type.
 */
export interface FileEntity {
  id: number;
  name: string;
  alternativeText?: string | null;
  caption?: string | null;
  focalPoint?: FocalPoint | null;
  width?: number | null;
  height?: number | null;
  formats?: Record<string, FileFormat> | null;
  hash: string;
  ext?: string;
  mime: string;
  /**
   * Size in kilobytes.
   */
  size: number;
  url: string;
  previewUrl?: string | null;
  provider: string;
  provider_metadata?: Record<string, unknown> | null;
  isUrlSigned?: boolean;
  folder?: number | null;
  folderPath?: string;
  related?: {
    id: string | number;
    __type: string;
    __pivot: { field: string };
  }[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number;
  updatedBy?: number;
}

/**
 * A file the upload plugin can sign: a file entity, or a file built from a bare
 * URL found in rich text, for which only the URL, hash and extension are known.
 */
export type SignableFile = Providers.Upload.SignableFile &
  Partial<Pick<FileEntity, 'provider' | 'formats' | 'isUrlSigned'>>;

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
  files?: FileEntity[];
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

type Writable<T> = { -readonly [K in keyof T]: T[K] };

/**
 * An incoming file after the upload plugin normalized it: named, hashed, sized in
 * kilobytes and readable as a stream. The plugin hands it to the provider as a
 * `Providers.Upload.PendingFile`, then saves it as a `FileEntity`.
 */
export interface UploadableFile extends Writable<Providers.Upload.PendingFile> {
  focalPoint?: FocalPoint | null;
  /**
   * The thumbnail and responsive formats, uploaded along with the file.
   */
  formats?: Record<string, UploadableFile> | null;
  folder?: number | null;
  folderPath?: string;
  related?: FileEntity['related'];
  /**
   * Set after the provider stored the file.
   */
  provider?: string;
  filepath?: string;
  tmpWorkingDirectory?: string;
  getStream: () => Readable;
}

/**
 * The provider the upload plugin stores in `strapi.plugin('upload').provider`:
 * the provider instance, with defaults for the optional methods.
 */
export interface UploadProvider extends Providers.Upload.Provider {
  checkFileSize: NonNullable<Providers.Upload.Provider['checkFileSize']>;
  getSignedUrl: NonNullable<Providers.Upload.Provider['getSignedUrl']>;
  isPrivate: NonNullable<Providers.Upload.Provider['isPrivate']>;
  extend: (obj: Partial<UploadProvider>) => void;
}

/**
 * The image the AI metadata service sends for captioning: the URL of a stored
 * file or of its thumbnail.
 */
export interface AIMetadataImage {
  /**
   * Relative to the server URL for the `local` provider, absolute otherwise.
   */
  url: string;
  mime: string;
  provider: string;
}

/**
 * @deprecated Use `FileEntity`. `File` also shadows the global `File` type.
 */
export type File = FileEntity;

export type FileInfo = {
  name?: string | null;
  alternativeText?: string | null;
  caption?: string | null;
  focalPoint?: FocalPoint | null;
  folder?: number | null;
};
