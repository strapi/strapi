import { createContext, useContext, ReactNode, useEffect, useState } from 'react';

import { useDataManager } from '../../DataManager/useDataManager';
import { transformChatToCTB } from '../lib/transforms/schemas/toCTB';
import { SchemaChange } from '../lib/types/annotations';
import { AIMessage } from '../lib/types/messages';

import { useStrapiChat } from './ChatProvider';

interface SchemaContextType {
  lastRevisedId: string | null;
  setLastRevisedId: (id: string | null) => void;
}

const SchemaContext = createContext<SchemaContextType | undefined>(undefined);

const TYPE_TO_ACTION: Record<string, 'add' | 'update' | 'delete'> = {
  create: 'add',
  update: 'update',
  remove: 'delete',
};

function extractSchemaChangesFromMessage(message: AIMessage): SchemaChange[] {
  if (message.role !== 'assistant') return [];

  const changes: SchemaChange[] = [];

  message.parts?.forEach((part, partIndex) => {
    // We only care about the schema generation tool
    if (part && typeof part === 'object' && part.type === 'tool-schemaGenerationTool') {
      // Prefer validated schemas from output; ignore if there's an error or no output yet
      const output = part.output as { schemas?: any[]; error?: unknown } | undefined;
      if (!output || output.error || !Array.isArray(output.schemas)) return;

      const baseId = part.toolCallId ?? `${message.id}-${partIndex}`;

      output.schemas.forEach((schema, schemaIndex) => {
        const revisionId = `${baseId}-${schema.uid ?? schema.name ?? schemaIndex}`;
        const type = (schema.action as SchemaChange['type']) || 'update';
        changes.push({ type, schema, revisionId });
      });
    }
  });

  return changes;
}

export const SchemaChatProvider = ({ children }: { children: ReactNode }) => {
  const [lastRevisedId, setLastRevisedId] = useState<string | null>(null);
  const { messages, status } = useStrapiChat();
  const { contentTypes, components, applyChange } = useDataManager();

  useEffect(() => {
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage) return;
    if (latestMessage.role !== 'assistant') return;
    // Wait until message streaming has finished
    if (status !== 'ready') return;

    // const schemaChanges = latestMessage.schemaChanges;
    const schemaChanges = extractSchemaChangesFromMessage(latestMessage);

    schemaChanges.forEach((change: SchemaChange) => {
      const oldSchema =
        contentTypes[change.schema.uid as any] || components[change.schema.uid as any];
      const newSchema = transformChatToCTB(change.schema, oldSchema);
      applyChange({
        action: TYPE_TO_ACTION[change.type]!,
        schema: newSchema,
      });
    });
    setLastRevisedId(latestMessage.id);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  return (
    <SchemaContext.Provider value={{ lastRevisedId, setLastRevisedId }}>
      {children}
    </SchemaContext.Provider>
  );
};

export const useChatSchema = () => {
  const context = useContext(SchemaContext);
  if (context === undefined) {
    throw new Error('useSchema must be used within a SchemaProvider');
  }
  return context;
};
