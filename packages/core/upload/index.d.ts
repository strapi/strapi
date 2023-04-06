import type { ReadStream } from 'fs';

export interface File {
  name: string;
  alternativeText?: string;
  caption?: string;
  width?: number;
  height?: number;
  formats: Record<string, unknown>;
  hash: string;
  ext?: string;
  mime: string;
  size: number;
  url: string;
  previewUrl?: string;
  provider: string;
  provider_metadata: Record<string, unknown>;
  path?: string;
  stream?: ReadStream;
  buffer?: Buffer;
}

export type FileStream = File & Required<Pick<File, 'stream'>>;
export type FileBuffer = File & Required<Pick<File, 'buffer'>>;
