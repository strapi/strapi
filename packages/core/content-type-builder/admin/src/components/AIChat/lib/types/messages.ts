import type { UIMessage } from '@ai-sdk/react';

export type Status = 'loading' | 'success' | 'error';

export interface MarkerContent {
  type: 'marker';
  title: string;
  state: Status;
  link?: string;
  steps: Array<{
    id: string;
    description: string;
    // Use present-tense to match Marker.tsx UI logic
    status: 'create' | 'update' | 'remove';
    link?: string;
  }>;
}

export interface TextContent {
  type: 'text';
  text: string;
}

export type MessageContent = TextContent | MarkerContent;

// export type UserMessage = {
//   id: string;
//   revisionId?: string;
//   role: 'user';
//   contents: TextContent[];
//   attachments: FileUIPart[];
//   project?: string;
// };
// export type AssistantMessage = {
//   id: string;
//   revisionId?: string;
//   role: 'assistant';
//   schemaChanges: SchemaChange[];
//   contents: MessageContent[];
//   status: Status;
// };

export type AIMessage = UIMessage;
export type UserMessage = Omit<AIMessage, 'role'> & { role: 'user' };
export type AssistantMessage = Omit<AIMessage, 'role'> & { role: 'assistant' };

// export type Message = UserMessage | AssistantMessage;
