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
    font-family: 'SF Mono', SFMono-Regular, ui-monospace, 'DejaVu Sans Mono', Menlo, Consolas,
      monospace;
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

const isSchemaToolPart = (part: any): part is SchemaToolPart =>
  part && typeof part === 'object' && part.type === 'tool-schemaGenerationTool';

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
            a: ({ node, ...props }) => <a target="_blank" rel="noopener noreferrer" {...props} />,
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
  const hasText = message.parts.some(
    (content) => content.type === 'text' && content.text.trim() !== ''
  );
  const attachments = message.parts.filter((content) => content.type === 'file');

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
          {message.parts.map((content, index) => {
            if (content.type !== 'text') return null;
            return <UserMessageTypography key={index}>{content.text}</UserMessageTypography>;
          })}
        </Box>
      ) : null}

      {/* Attachments */}
      {attachments.map((attachment, idx) => (
        <AttachmentPreview
          key={`${attachment.type === 'file' ? attachment.filename : attachment.type}-${idx}`}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          attachment={{ ...attachment, status: 'ready' } as any}
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

  return (
    <Box style={{ alignSelf: 'flex-start' }} maxWidth="90%">
      {message.parts.map((content, index) => (
        <MessageContent key={index} part={content} />
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

export const ChatMessage = ({
  message,
  isLoading,
}: {
  message: AIMessage;
  isLoading?: boolean;
}) => {
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
