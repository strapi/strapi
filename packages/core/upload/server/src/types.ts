import type { File as FormidableFile } from 'formidable';
import type { FocalPoint, UploadFile } from '../../shared/contracts/files';

export type InputFile = FormidableFile & {
  path?: string;
  tmpWorkingDirectory?: string;
  provider?: string;
};

/**
 * @deprecated use {@linkcode UploadFile} instead. {@linkcode File} often gets shadowed by {@linkcode global.File}
 */
export type File = UploadFile;

export interface Folder {
  id: number;
  name: string;
  pathId: number;
  /**
   * parent id
   */
  parent?: number;
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

export interface UploadableFile extends Omit<File, 'id'> {
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
