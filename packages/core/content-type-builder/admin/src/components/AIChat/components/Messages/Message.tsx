import { useMemo } from 'react';

import { useNotification } from '@strapi/admin/strapi-admin';
import { Typography, Box, IconButton, Flex } from '@strapi/design-system';
import { Duplicate } from '@strapi/icons';
import Markdown from 'react-markdown';
import { styled } from 'styled-components';

import { STRAPI_CODE_MIME_TYPE } from '../../lib/constants';
import {
  Message as TMessage,
  MessageContent,
  UserMessage as UserMessageType,
  AssistantMessage as AssistantMessageType,
} from '../../lib/types/messages';
import { AnimatedBox } from '../AnimatedBox';
import { ProjectAttachment } from '../Attachments/ProjectAttachment';

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

  /* Optional: code blocks, blockquotes, etc. */
  code {
    background-color: ${({ theme }) => theme.colors.neutral100};
    padding: 0.2em 0.4em;
    border-radius: ${({ theme }) => theme.borderRadius};
  }
`;

const MessageContent = ({ content }: { content: MessageContent }) => {
  if (content.type === 'text') {
    return (
      <MarkdownStyles>
        <Markdown>{content.text}</Markdown>
      </MarkdownStyles>
    );
  }

  if (content.type === 'marker') {
    return <Marker title={content.title} steps={content.steps} state={content.state} />;
  }

  return null;
};

const UserMessage = ({ message }: { message: UserMessageType }) => {
  return (
    <AnimatedBox
      as={Flex}
      direction="column"
      alignItems="flex-end"
      style={{ alignSelf: 'flex-end' }}
      gap={2}
      maxWidth="80%"
    >
      <Box
        background="primary100"
        borderColor="primary200"
        borderStyle="none"
        padding={3}
        hasRadius
      >
        {message.contents.map((content, index) => {
          if (content.type !== 'text') return null;
          return <Typography key={index}>{content.text}</Typography>;
        })}
      </Box>
      {/* Code Attachments */}
      {message.attachments
        .filter((attachment) => attachment.contentType === STRAPI_CODE_MIME_TYPE)
        .map((attachment, idx) => (
          <ProjectAttachment key={`${attachment.name}-${idx}`} name={attachment.name!} />
        ))}
    </AnimatedBox>
  );
};

const AssistantMessage = ({ message }: { message: AssistantMessageType }) => {
  const { toggleNotification } = useNotification();
  const handleCopyToClipboard = () => {
    const textContent = message.contents
      .filter((content) => content.type === 'text')
      .map((content: any) => content.text)
      .join('\n\n');

    navigator.clipboard.writeText(textContent);
    toggleNotification({
      type: 'success',
      message: 'Copied to clipboard',
    });
  };

  return (
    <Box style={{ alignSelf: 'flex-start' }} maxWidth="90%">
      {message.contents.map((content, index) => (
        <MessageContent key={index} content={content} />
      ))}
      {message.status !== 'loading' ? (
        <IconButton label="Copy to clipboard" size="S" onClick={handleCopyToClipboard}>
          <Duplicate />
        </IconButton>
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
