import type { Attachment as AIAttachment } from 'ai';

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
} & AIAttachment;
