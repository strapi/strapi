import { SchemaChange } from './annotations';

import type { Attachment } from 'ai';

export interface MarkerContent {
  type: 'marker';
  title: string;
  state: 'loading' | 'success' | 'error';
  steps: Array<{ id: string; description: string }>;
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
  status: 'loading' | 'success' | 'error';
};

export type Message = UserMessage | AssistantMessage;
