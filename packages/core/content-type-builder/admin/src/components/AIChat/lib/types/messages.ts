import { SchemaChange } from './annotations';

import type { Attachment } from 'ai';

export type Status = 'loading' | 'success' | 'error';

export interface MarkerContent {
  type: 'marker';
  title: string;
  state: Status;
  link?: string;
  steps: Array<{
    id: string;
    description: string;
    status: 'created' | 'updated' | 'removed';
    link?: string;
  }>;
}

export interface TextContent {
  type: 'text';
  text: string;
}

export type MessageContent = TextContent | MarkerContent;

export type UserMessage = {
  id: string;
  revisionId?: string;
  role: 'user';
  contents: TextContent[];
  attachments: Attachment[];
  project?: string;
};

export type AssistantMessage = {
  id: string;
  revisionId?: string;
  role: 'assistant';
  schemaChanges: SchemaChange[];
  contents: MessageContent[];
  status: Status;
};

export type Message = UserMessage | AssistantMessage;
