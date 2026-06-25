import { ReactNode, useEffect, useRef } from 'react';

import { GUIDED_TOUR_REQUIRED_ACTIONS, useGuidedTour } from '@strapi/admin/strapi-admin';
import { useDispatch } from 'react-redux';

import { useDataManager } from '../../DataManager/useDataManager';
import { applyCTBOperations } from '../lib/applyCTBOperations';
import { isCtbAiOperationsV2Enabled } from '../lib/constants';
import { AIMessage } from '../lib/types/messages';

import { useStrapiChat } from './ChatProvider';

import type { CTBOperation, CTBOperationsResult } from '../lib/types/ctbOperations';

export function extractOperationsFromMessage(message: AIMessage): CTBOperation[] {
  if (message.role !== 'assistant') return [];

  const operations: CTBOperation[] = [];

  message.parts?.forEach((part) => {
    if (part && typeof part === 'object' && part.type === 'tool-schemaOperationsTool') {
      const output = part.output as (CTBOperationsResult & { error?: unknown }) | undefined;
      if (!output || output.error || !Array.isArray(output.operations)) return;

      operations.push(...output.operations);
    }
  });

  return operations;
}

export function messageHasOperationsToolPart(message: AIMessage): boolean {
  if (message.role !== 'assistant') return false;

  return (
    message.parts?.some(
      (part) => part && typeof part === 'object' && part.type === 'tool-schemaOperationsTool'
    ) ?? false
  );
}

/**
 * Applies CTB AI v2 `schemaOperationsTool` output by dispatching ordered operations to
 * DataManager. Active only when `STRAPI_AI_CTB_V2=true`.
 */
export const OperationsChatProvider = ({ children }: { children: ReactNode }) => {
  const { messages, status } = useStrapiChat();
  const dataManager = useDataManager();
  const dispatch = useDispatch();
  const guidedTourDispatch = useGuidedTour('OperationsChatProvider', (s) => s.dispatch);
  const guidedTourState = useGuidedTour('OperationsChatProvider', (s) => s.state);
  const lastAppliedMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isCtbAiOperationsV2Enabled()) return;

    const latestMessage = messages[messages.length - 1];
    if (!latestMessage) return;
    if (latestMessage.role !== 'assistant') return;
    if (status !== 'ready') return;
    if (lastAppliedMessageIdRef.current === latestMessage.id) return;

    const operations = extractOperationsFromMessage(latestMessage);
    if (operations.length === 0) return;

    const isAddFieldCompleted = guidedTourState.completedActions.includes(
      GUIDED_TOUR_REQUIRED_ACTIONS.contentTypeBuilder.addField
    );

    if (!isAddFieldCompleted && operations.some((operation) => operation.op === 'addAttribute')) {
      guidedTourDispatch({
        type: 'set_completed_actions',
        payload: [GUIDED_TOUR_REQUIRED_ACTIONS.contentTypeBuilder.addField],
      });
    }

    applyCTBOperations(operations, dataManager, { dispatch });
    lastAppliedMessageIdRef.current = latestMessage.id;
  }, [
    messages,
    status,
    dataManager,
    dispatch,
    guidedTourDispatch,
    guidedTourState.completedActions,
  ]);

  return children;
};
