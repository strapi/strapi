import { useMemo } from 'react';

import { Typography, Box, IconButton, Flex } from '@strapi/design-system';
import { ThumbUp, ThumbDown } from '@strapi/icons';
import Markdown from 'react-markdown';
import { styled } from 'styled-components';

import { useFeedbackModal } from '../../FeedbackModal';
import { useFeedback } from '../../hooks/useFeedback';
import {
  Message as TMessage,
  MessageContent,
  UserMessage as UserMessageType,
  AssistantMessage as AssistantMessageType,
} from '../../lib/types/messages';
import { AnimatedBox } from '../AnimatedBox';
import { AttachmentPreview } from '../Attachments/AttachmentPreview';

import { Marker } from './Marker';

const MarkdownStyles = styled(Typography)`
  max-width: 65ch;
  margin: 0 auto;

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
    color: ${({ theme }) => theme.colors.primary};
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

const MessageContent = ({
  content,
}: {
  content: MessageContent;
  status?: 'loading' | 'success' | 'error';
}) => {
  if (content.type === 'text') {
    return (
      <MarkdownStyles>
        <Markdown
          components={{
            a: ({ node, ...props }) => <a target="_blank" rel="noopener noreferrer" {...props} />,
          }}
        >
          {content.text}
        </Markdown>
      </MarkdownStyles>
    );
  }

  if (content.type === 'marker') {
    return <Marker {...content} />;
  }

  return null;
};

const UserMessage = ({ message }: { message: UserMessageType }) => {
  const hasText = message.contents.some(
    (content) => content.type === 'text' && content.text.trim() !== ''
  );

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
        <Box background="neutral150" borderStyle="none" padding={3} hasRadius>
          {message.contents.map((content, index) => {
            if (content.type !== 'text') return null;
            return <Typography key={index}>{content.text}</Typography>;
          })}
        </Box>
      ) : null}

      {/* Attachments */}
      {message.attachments.map((attachment, idx) => (
        <AttachmentPreview key={`${attachment.name}-${idx}`} attachment={attachment as any} />
      ))}
    </AnimatedBox>
  );
};

const AssistantMessage = ({ message }: { message: AssistantMessageType }) => {
  const { upvoteMessage } = useFeedback();
  const { openFeedbackModal } = useFeedbackModal();

  return (
    <Box style={{ alignSelf: 'flex-start' }} maxWidth="90%">
      {message.contents.map((content, index) => (
        <MessageContent key={index} content={content} />
      ))}
      {message.status !== 'loading' ? (
        <Flex>
          <IconButton
            label="Upvote"
            size="S"
            variant="ghost"
            onClick={() => upvoteMessage(message.id)}
          >
            <ThumbUp />
          </IconButton>
          <IconButton
            label="Downvote"
            size="S"
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

export const ChatMessage: React.FC<{ message: TMessage }> = ({ message }) => {
  /**
   * IMPORTANT: Messages are rendered using react-markdown (heavy compute)
   * This memoizes messages so only the new streamed ones are re-rendered.
   *
   * Else, every new streamed character would re-render the entire chat.
   */
  return useMemo(() => {
    if (message.role === 'user') {
      return <UserMessage message={message} />;
    }
    return <AssistantMessage message={message} />;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.revisionId]); // Only re-render if message id changes
};
