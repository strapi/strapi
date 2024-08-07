import type { File as FormidableFile } from 'formidable';

export type InputFile = FormidableFile & {
  path?: string;
  tmpWorkingDirectory?: string;
};

export interface File {
  id: number;
  name: string;
  alternativeText?: string | null;
  caption?: string | null;
  width?: number;
  height?: number;
  formats?: Record<string, unknown>;
  hash: string;
  ext?: string;
  mime?: string;
  size?: number;
  sizeInBytes?: number;
  url?: string;
  previewUrl?: string;
  path?: string | null;
  provider?: string;
  provider_metadata?: Record<string, unknown>;
  isUrlSigned?: boolean;
  folder?: number;
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
  folder?: number;
};
