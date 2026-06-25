import { extractOperationsFromMessage, messageHasOperationsToolPart } from '../OperationsProvider';

import type { CTBOperation } from '../../lib/types/ctbOperations';
import type { AIMessage } from '../../lib/types/messages';

const renameOp: CTBOperation = {
  op: 'editAttribute',
  forTarget: 'contentType',
  targetUid: 'api::article.article',
  name: 'title',
  attributeToSet: { name: 'heading', type: 'string', required: true },
};

const assistantMessage = (parts: AIMessage['parts']): AIMessage =>
  ({
    id: 'msg-1',
    role: 'assistant',
    parts,
  }) as AIMessage;

describe('OperationsProvider extraction', () => {
  describe('extractOperationsFromMessage', () => {
    it('returns empty array for user messages', () => {
      expect(
        extractOperationsFromMessage({
          id: 'u1',
          role: 'user',
          parts: [{ type: 'text', text: 'hello' }],
        } as AIMessage)
      ).toEqual([]);
    });

    it('extracts operations from a completed tool-schemaOperationsTool part', () => {
      const message = assistantMessage([
        { type: 'text', text: 'Renaming the field.' },
        {
          type: 'tool-schemaOperationsTool',
          toolCallId: 'call-1',
          output: { operations: [renameOp] },
        },
      ]);

      expect(extractOperationsFromMessage(message)).toEqual([renameOp]);
    });

    it('concatenates operations from multiple tool parts in order', () => {
      const addOp: CTBOperation = {
        op: 'addAttribute',
        forTarget: 'contentType',
        targetUid: 'api::article.article',
        attributeToSet: { name: 'slug', type: 'uid', targetField: 'heading' },
      };

      const message = assistantMessage([
        {
          type: 'tool-schemaOperationsTool',
          toolCallId: 'call-1',
          output: { operations: [renameOp] },
        },
        {
          type: 'tool-schemaOperationsTool',
          toolCallId: 'call-2',
          output: { operations: [addOp] },
        },
      ]);

      expect(extractOperationsFromMessage(message)).toEqual([renameOp, addOp]);
    });

    it('ignores tool parts without output, with errors, or missing operations', () => {
      expect(
        extractOperationsFromMessage(
          assistantMessage([{ type: 'tool-schemaOperationsTool', toolCallId: 'call-1' }])
        )
      ).toEqual([]);

      expect(
        extractOperationsFromMessage(
          assistantMessage([
            {
              type: 'tool-schemaOperationsTool',
              toolCallId: 'call-1',
              output: { error: 'validation failed', operations: [renameOp] },
            },
          ])
        )
      ).toEqual([]);

      expect(
        extractOperationsFromMessage(
          assistantMessage([
            {
              type: 'tool-schemaOperationsTool',
              toolCallId: 'call-1',
              output: { operations: 'not-an-array' as unknown as CTBOperation[] },
            },
          ])
        )
      ).toEqual([]);
    });

    it('ignores tool-schemaGenerationTool parts', () => {
      const message = assistantMessage([
        {
          type: 'tool-schemaGenerationTool',
          output: {
            schemas: [{ action: 'update', uid: 'api::article.article', name: 'Article' }],
          },
        },
      ]);

      expect(extractOperationsFromMessage(message)).toEqual([]);
    });
  });

  describe('messageHasOperationsToolPart', () => {
    it('detects operations tool parts even before output is available', () => {
      const message = assistantMessage([
        { type: 'tool-schemaOperationsTool', toolCallId: 'call-1' },
      ]);

      expect(messageHasOperationsToolPart(message)).toBe(true);
      expect(extractOperationsFromMessage(message)).toEqual([]);
    });

    it('returns false when no operations tool part is present', () => {
      expect(
        messageHasOperationsToolPart(
          assistantMessage([{ type: 'tool-schemaGenerationTool', toolCallId: 'call-1' }])
        )
      ).toBe(false);
    });
  });
});
