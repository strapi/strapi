import { useId, useRef } from 'react';

import { Typography, Box, IconButton, Flex } from '@strapi/design-system';
import { ThumbUp, ThumbDown } from '@strapi/icons';
import Markdown from 'react-markdown';
import { styled } from 'styled-components';

import { useFeedbackModal } from '../../FeedbackModal';
import { useFeedback } from '../../hooks/useFeedback';
import {
  AIMessage,
  type UserMessage as UserMessageType,
  AssistantMessage as AssistantMessageType,
  type MarkerContent as MarkerContentType,
} from '../../lib/types/messages';
import { AnimatedBox } from '../AnimatedBox';
import { AttachmentPreview } from '../Attachments/AttachmentPreview';

import { Marker } from './Marker';

const MarkdownStyles = styled(Typography)`
  max-width: 65ch;
  margin: 0 auto;
  overflow-wrap: anywhere;
  word-break: break-word;

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    margin-top: 1.25em;
    margin-bottom: 0.5em;
    font-weight: bold;
  }

  p {
    margin-bottom: 1em;
  }

  ul,
  ol {
    padding-left: 1.5em; /* indentation for bullet points */
    margin-bottom: 1em;
  }

  li {
    margin-bottom: 0.5em;
    list-style-type: disc; /* or whatever style you prefer */
  }

  strong {
    font-weight: bold;
  }

  /* code blocks, blockquotes, etc. */
  code {
    background-color: ${({ theme }) => theme.colors.neutral100};
    padding: 0.2em 0.4em;
    border-radius: ${({ theme }) => theme.borderRadius};
    border-color: ${({ theme }) => theme.colors.neutral150};
    border-style: solid;
    font-family:
      'SF Mono', SFMono-Regular, ui-monospace, 'DejaVu Sans Mono', Menlo, Consolas, monospace;
  }

  /* links */
  a {
    color: ${({ theme }) => theme.colors.primary500};
    background-color: ${({ theme }) => theme.colors.neutral100};
    padding: 0.2em 0.4em;
    border-radius: ${({ theme }) => theme.borderRadius};
    border-color: ${({ theme }) => theme.colors.neutral150};
    border-style: solid;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const UserMessageTypography = styled(Typography)`
  overflow-wrap: anywhere;
  word-break: break-word;
`;

// ---------------------------
// Tool: schemaGenerationTool helpers
// ---------------------------

type SchemaToolSchema = {
  action?: 'create' | 'update' | 'remove';
  uid?: string;
  name?: string;
  category?: string;
  kind?: 'collectionType' | 'singleType' | 'component';
  modelType?: 'component' | 'collectionType' | 'singleType';
};

type SchemaToolPart = {
  type: 'tool-schemaGenerationTool';
  input?: { schemas?: SchemaToolSchema[] };
  output?: { schemas?: SchemaToolSchema[]; error?: unknown };
  toolCallId?: string;
};

const isSchemaToolPart = (part: unknown): part is SchemaToolPart => {
  if (typeof part !== 'object' || part === null || !('type' in part)) {
    return false;
  }

  return part.type === 'tool-schemaGenerationTool';
};

/**
 * Exported for unit tests only. The AI chat needs a live AI backend, so no E2E
 * run can reach this logic.
 */
export const getPartFingerprint = (part: AIMessage['parts'][number]) => {
  if (part.type === 'text') {
    return `text:${part.text}`;
  }

  if (part.type === 'file') {
    return `file:${part.filename ?? ''}:${part.mediaType}:${part.url}`;
  }

  if ('toolCallId' in part && typeof part.toolCallId === 'string') {
    return `${part.type}:${part.toolCallId}`;
  }

  return part.type;
};

type PartRecord = {
  fingerprint: string;
  key: string;
  part: AIMessage['parts'][number];
};

/**
 * Gives each part a key that survives across renders. A key derived from the
 * part content alone cannot work: a streaming text part changes on every chunk,
 * so its fingerprint would change on every tick and remount the node mid
 * stream. Hence the fallback chain below: exact fingerprint match first, then
 * object identity, then same slot and same type for the streaming case.
 *
 * Exported for unit tests only. The AI chat needs a live AI backend, so no E2E
 * run can reach this logic.
 */
export const usePartsWithKeys = (parts: AIMessage['parts']) => {
  const keyPrefix = useId();
  const nextKey = useRef(0);
  const previousParts = useRef<PartRecord[]>([]);
  const matchedParts = new Set<PartRecord>();

  const exactMatches = parts.map((part) => {
    const fingerprint = getPartFingerprint(part);
    const exactMatch = previousParts.current.find(
      (candidate) => candidate.fingerprint === fingerprint && !matchedParts.has(candidate)
    );
    const sameObject = previousParts.current.find(
      (candidate) => candidate.part === part && !matchedParts.has(candidate)
    );
    const previousPart = exactMatch ?? sameObject;

    if (previousPart) {
      matchedParts.add(previousPart);
    }

    return { fingerprint, part, previousPart };
  });

  const keyedParts = exactMatches.map(({ fingerprint, part, previousPart }, index) => {
    const sameSlot = previousParts.current[index];
    const streamingMatch =
      !previousPart && sameSlot && sameSlot.part.type === part.type && !matchedParts.has(sameSlot)
        ? sameSlot
        : undefined;
    const matchedPart = previousPart ?? streamingMatch;
    const key = matchedPart?.key ?? `${keyPrefix}-${nextKey.current}`;

    if (streamingMatch) {
      matchedParts.add(streamingMatch);
    }

    if (matchedPart) {
      matchedParts.add(matchedPart);
    } else {
      nextKey.current += 1;
    }

    return { fingerprint, key, part };
  });

  /**
   * Both refs are written during render. The outcome depends only on the parts
   * passed in, so re-invoking the render function is harmless: on the second
   * pass of a StrictMode double render every part exact-matches the record the
   * first pass stored here, the same keys come back out and `nextKey` does not
   * advance.
   */
  previousParts.current = keyedParts;

  return keyedParts;
};

const capitalize = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

const getSchemaLink = (schema: SchemaToolSchema): string | undefined => {
  const isComponent = (schema.kind ?? schema.modelType) === 'component';
  if (!schema.uid) return undefined;
  return isComponent
    ? `/plugins/content-type-builder/component-categories/${schema.category ?? ''}/${schema.uid}`
    : `/plugins/content-type-builder/content-types/${schema.uid}`;
};

const toMarkerFromSchemaTool = (part: SchemaToolPart): MarkerContentType => {
  const outSchemas = part.output?.schemas ?? [];
  const inSchemas = part.input?.schemas ?? [];

  const schemas = (outSchemas.length ? outSchemas : inSchemas) as SchemaToolSchema[];
  const numSchemas = schemas.length;

  const state: 'loading' | 'success' | 'error' = part.output
    ? part.output.error
      ? 'error'
      : 'success'
    : 'loading';

  const steps = schemas.map((schema, index) => ({
    id: `${part.toolCallId ?? 'schemaGenerationTool'}-${schema.uid ?? schema.name ?? index}`,
    description: capitalize(schema.name ?? schema.uid ?? 'Schema'),
    status:
      schema.action === 'create' || schema.action === 'update' || schema.action === 'remove'
        ? schema.action
        : ('update' as const),
    link: getSchemaLink(schema),
  }));

  const title =
    state === 'success'
      ? `Updated ${numSchemas} schema${numSchemas === 1 ? '' : 's'}`
      : state === 'error'
        ? `Failed to update schema${numSchemas === 1 ? '' : 's'}`
        : 'Updating schemas';

  return {
    type: 'marker',
    title,
    state,
    steps,
  };
};

const MessageContent = ({
  part,
}: {
  part: AIMessage['parts'][number];
  status?: 'loading' | 'success' | 'error';
}) => {
  if (part.type === 'text') {
    return (
      <MarkdownStyles>
        <Markdown
          components={{
            a: ({ node: _node, ...props }) => (
              <a target="_blank" rel="noopener noreferrer" {...props} />
            ),
          }}
        >
          {part.text}
        </Markdown>
      </MarkdownStyles>
    );
  }

  if (isSchemaToolPart(part)) {
    const marker = toMarkerFromSchemaTool(part);
    return <Marker {...marker} />;
  }

  return null;
};

const UserMessage = ({ message }: { message: UserMessageType }) => {
  const partsWithKeys = usePartsWithKeys(message.parts);
  const hasText = partsWithKeys.some(({ part }) => part.type === 'text' && part.text.trim() !== '');
  const attachments = partsWithKeys.filter(({ part }) => part.type === 'file');

  return (
    <AnimatedBox
      as={Flex}
      direction="column"
      alignItems="flex-end"
      style={{ alignSelf: 'flex-end' }}
      gap={2}
      maxWidth="80%"
    >
      {hasText ? (
        <Box background="neutral150" borderStyle="none" padding={['10px', '16px']} hasRadius>
          {partsWithKeys.map(({ key, part }) => {
            if (part.type !== 'text') return null;
            return <UserMessageTypography key={key}>{part.text}</UserMessageTypography>;
          })}
        </Box>
      ) : null}

      {/* Attachments */}
      {attachments.map(({ key, part }) => (
        <AttachmentPreview
          key={key}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          attachment={{ ...part, status: 'ready' } as any}
        />
      ))}
    </AnimatedBox>
  );
};

const AssistantMessage = ({
  message,
  isLoading,
}: {
  message: AssistantMessageType;
  isLoading?: boolean;
}) => {
  const { upvoteMessage } = useFeedback();
  const { openFeedbackModal } = useFeedbackModal();
  const partsWithKeys = usePartsWithKeys(message.parts);

  return (
    <Box style={{ alignSelf: 'flex-start' }} maxWidth="90%">
      {partsWithKeys.map(({ key, part }) => (
        <MessageContent key={key} part={part} />
      ))}
      {isLoading ? (
        <Flex gap={1}>
          <IconButton
            label="Upvote"
            size="XS"
            variant="ghost"
            onClick={() => upvoteMessage(message.id)}
          >
            <ThumbUp />
          </IconButton>
          <IconButton
            label="Downvote"
            size="XS"
            variant="ghost"
            // For downvoting, user must provide specific feedback
            onClick={() => openFeedbackModal(message.id)}
          >
            <ThumbDown />
          </IconButton>
        </Flex>
      ) : null}
    </Box>
  );
};

export const ChatMessage = ({ message }: { message: AIMessage }) => {
  /**
   * IMPORTANT: Messages are rendered using react-markdown (heavy compute)
   * Component re-renders on each message update, but AI SDK v5 provides
   * throttling (experimental_throttle: 100ms) which batches updates and reduces
   * re-render frequency during streaming.
   */
  if (message.role === 'user') {
    return <UserMessage message={message as UserMessageType} />;
  }
  return <AssistantMessage message={message as AssistantMessageType} />;
};
