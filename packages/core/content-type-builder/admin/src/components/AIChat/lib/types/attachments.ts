import type { FileUIPart } from 'ai';

export type Project = {
  id: string;
  name: string;
  timestamp: string;
  type: 'code';
  files: {
    path: string;
    content: string;
  }[];
};

export type Attachment = {
  id: string;
  status: 'loading' | 'ready';
} & FileUIPart;
