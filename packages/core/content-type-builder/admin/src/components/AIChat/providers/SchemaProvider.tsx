import { createContext, useContext, ReactNode, useEffect, useState } from 'react';

import { useDataManager } from '../../DataManager/useDataManager';
import { transformChatToCTB } from '../lib/transforms/schemas/toCTB';
import { SchemaChange } from '../lib/types/annotations';

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

export const SchemaChatProvider = ({ children }: { children: ReactNode }) => {
  const [lastRevisedId, setLastRevisedId] = useState<string | null>(null);
  const { messages } = useStrapiChat();
  const { contentTypes, components, applyChange } = useDataManager();

  useEffect(() => {
    const latestMessage = messages[messages.length - 1];

    if (!latestMessage) return;
    if (latestMessage.role !== 'assistant') return;

    const schemaChanges = latestMessage.schemaChanges;
    const lastRevisedChange = schemaChanges.findIndex(
      (c: SchemaChange) => c.revisionId === lastRevisedId
    );

    const newSchemaChanges = schemaChanges.slice(lastRevisedChange + 1);
    if (!newSchemaChanges.length) return;

    newSchemaChanges.forEach((change: SchemaChange) => {
      const oldSchema =
        contentTypes[change.schema.uid as any] || components[change.schema.uid as any];
      const newSchema = transformChatToCTB(change.schema, oldSchema);
      applyChange({
        action: TYPE_TO_ACTION[change.type]!,
        schema: newSchema,
      });
    });

    setLastRevisedId(newSchemaChanges.at(-1)!.revisionId);
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
