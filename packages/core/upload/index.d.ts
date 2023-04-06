import type { ReadStream } from 'fs';

export interface File {
  name: string;
  size: number;
  hash: string;
  ext: string;
  url: string;
  mime: string;
  path?: string;
  stream?: ReadStream;
  buffer?: Buffer;
}

export type FileStream = File & Required<Pick<File, 'stream'>>;
export type FileBuffer = File & Required<Pick<File, 'buffer'>>;
