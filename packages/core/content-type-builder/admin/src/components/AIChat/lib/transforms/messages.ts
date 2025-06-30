/* eslint-disable @typescript-eslint/no-explicit-any */
import { SchemaChange, SchemaChangeAnnotation, ToolAnnotation } from '../types/annotations';
import { AssistantMessage, MarkerContent, Message, Status, UserMessage } from '../types/messages';

import type { UIMessage as RawMessage, ToolInvocation } from 'ai';

export type TransformOptions = {
  isLoading?: boolean;
  error?: any;
};

function transformToolCall(
  toolCall: ToolInvocation,
  annotations?: RawMessage['annotations'],
  options: TransformOptions = {}
) {
  const toolName = toolCall.toolName;

  if (toolCall.state !== 'result' && toolCall.state !== 'call') return;

  let state: Status = 'success';
  if (!options.error && toolCall.state !== 'result' && options.isLoading) {
    state = 'loading';
  }

  if (toolName === 'schemaGenerationTool') {
    let schemaChanges = [];
    if (toolCall.state === 'result' && toolCall.result && Array.isArray(toolCall.result.schemas)) {
      // Prefer schemas from toolInvocation result
      schemaChanges = toolCall.result.schemas.map((schema: any) => ({
        // revisionId is not present in result, so use uid or name as fallback
        revisionId: `${toolCall.toolCallId}-${schema.uid || schema.name}`,
        schema,
        type: schema.action || 'update',
      }));
    }

    const numSchemas = schemaChanges.length;

    const action: MarkerContent = {
      type: 'marker',
      state,
      title:
        state === 'success'
          ? `Updated ${numSchemas} schema${numSchemas === 1 ? '' : 's'}`
          : 'Updating schemas',
      steps: schemaChanges.map((change: SchemaChange) => {
        return {
          id: change.revisionId,
          description: change.schema.name?.charAt(0).toUpperCase() + change.schema.name.slice(1),
          status: change.type,
          link:
            change.schema.modelType === 'component'
              ? `/plugins/content-type-builder/component-categories/${change.schema.category}/${change.schema.uid}` // Component
              : `/plugins/content-type-builder/content-types/${change.schema.uid}`, // Collection Type
        };
      }),
    };

    return {
      action,
      schemaChanges,
    };
  }
}

function getMessageStatus(
  message: RawMessage,
  isLastMessage: boolean,
  options: TransformOptions
): 'loading' | 'success' | 'error' {
  if (message.role === 'assistant' && isLastMessage) {
    if (options.error) return 'error';
    if (options.isLoading) return 'loading';
  }
  return 'success';
}

function transformAssistantMessage(
  message: RawMessage,
  isLastMessage: boolean,
  options: TransformOptions
): AssistantMessage {
  const status = getMessageStatus(message, isLastMessage, options);
  const assistantMessage: AssistantMessage = {
    id: message.id,
    // @ts-expect-error - revisionId does exist but is not typed from the ai/sdk side
    revisionId: message.revisionId,
    role: 'assistant',
    schemaChanges: [],
    contents: [],
    status,
  };

  for (const part of message.parts || []) {
    if (part.type === 'text') {
      assistantMessage.contents.push({
        type: 'text',
        text: part.text,
      });
    } else if (part.type === 'tool-invocation') {
      const toolInvocation = part.toolInvocation;
      const toolCallId = toolInvocation.toolCallId;
      const annotations = (message.annotations || []) as ToolAnnotation[];

      const result = transformToolCall(
        toolInvocation,
        annotations.filter((a) => a.toolCallId === toolCallId),
        options
      );

      if (!result) continue;

      if (result.schemaChanges) {
        assistantMessage.schemaChanges.push(...result.schemaChanges);
      }

      assistantMessage.contents.push(result.action);
    }
  }

  return assistantMessage;
}

function transformUserMessage(message: RawMessage): UserMessage {
  // Extract text from parts array
  const textPart = message.parts?.find((part) => part.type === 'text');
  const text = textPart?.type === 'text' ? textPart.text : '';

  return {
    id: message.id,
    role: 'user',
    contents: [
      {
        type: 'text',
        text,
      },
    ],
    attachments: message.experimental_attachments || [],
  };
}

export function transformMessages(
  messages: RawMessage[],
  options: TransformOptions = {}
): Message[] {
  const curatedMessages: Message[] = [];

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (message.role === 'assistant') {
      const curatedMessage = transformAssistantMessage(message, i === messages.length - 1, options);
      curatedMessages.push(curatedMessage);
    } else if (message.role === 'user') {
      curatedMessages.push(transformUserMessage(message));
    }
  }
  return curatedMessages;
}
