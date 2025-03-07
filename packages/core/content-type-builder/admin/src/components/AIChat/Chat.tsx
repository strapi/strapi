import { useEffect, useRef, useState } from 'react';

import { Flex, IconButton, Button, Typography, Box } from '@strapi/design-system';
import { Sparkle, ArrowUp, Plus } from '@strapi/icons';

import { Alert } from './components/Alert';
import { AnimatedBox } from './components/AnimatedBox';
import { NextLogo } from './components/Attachments/components/NextLogo';
import { ProjectAttachment } from './components/Attachments/ProjectAttachment';
import { NextModal } from './components/Attachments/UploadProjectModal';
import { Panel } from './components/FloatingPanel';
import { StopIcon } from './components/icons/StopIcon';
import { Input } from './components/Input';
import { ChatMessage } from './components/Messages/Message';
import { ResizableTextArea } from './components/ResizableTextArea';
import { useAttachments } from './hooks/useAttachments';
import { Message } from './lib/types/messages';
import { useStrapiChat } from './providers/ChatProvider';

const SUGGESTIONS = [
  'Generate a product schema',
  'Tell me about the Content-Type Builder',
  'Tell me about Strapi',
] as const;

const ChatSuggestions = () => {
  const { append } = useStrapiChat();

  return (
    <AnimatedBox>
      <Flex direction="column" alignItems={'flex-start'} gap={3}>
        <Typography variant="omega" fontWeight="bold">
          How can I help you?
        </Typography>
        <Flex direction="column" alignItems={'flex-start'} gap={2}>
          {SUGGESTIONS.map((suggestion) => (
            <Button
              key={suggestion}
              startIcon={<Sparkle />}
              size="S"
              variant="tertiary"
              onClick={() =>
                append({
                  role: 'user',
                  content: suggestion,
                })
              }
            >
              {suggestion}
            </Button>
          ))}
        </Flex>
      </Flex>
    </AnimatedBox>
  );
};

const ChatContent: React.FC<{
  messages: Message[];
}> = ({ messages }) => {
  const messageEndRef = useRef<HTMLDivElement>(null);
  const { status } = useStrapiChat();

  // Scroll to the bottom of the chat when new messages arrive
  useEffect(() => {
    if (status === 'ready' || status === 'error') return;
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  return (
    <Flex direction="column" gap={5}>
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      {status === 'error' && <Alert title="Something went wrong." variant="danger" />}
      <div ref={messageEndRef} />
    </Flex>
  );
};

const ChatInputAttachments = () => {
  const { files, removeFileByIndex } = useAttachments();
  const attachments = files && files.length > 0 ? Array.from(files) : [];

  if (!attachments.length) return null;

  return (
    <Input.Attachments>
      {attachments.map((file, index) => (
        <Box key={file.name} maxWidth={'200px'}>
          <ProjectAttachment name={file.name} onRemove={() => removeFileByIndex(index)} />
        </Box>
      ))}
    </Input.Attachments>
  );
};
const ChatInput = (props: any) => {
  const { input, handleSubmit, handleInputChange, messages, status, stop, isChatOpen } =
    useStrapiChat();
  const [isNextUploadModalOpen, setIsNextUploadModalOpen] = useState(false);

  // // Focus the textarea when the chat panel opens
  // useEffect(() => {
  //   if (isChatOpen) {
  //     setTimeout(() => {
  //       // Get all textarea elements in the chat panel and focus the first one
  //       const textareas = document.querySelectorAll('textarea');
  //       textareas.forEach((textarea) => textarea.focus());
  //     }, 10);
  //   }
  // }, [isChatOpen]);

  const isLoading = status === 'streaming' || status === 'submitted';

  return (
    <>
      {isNextUploadModalOpen && <NextModal onClose={() => setIsNextUploadModalOpen(false)} />}
      <form onSubmit={handleSubmit} {...props}>
        <Input.Root isLoading={isLoading} gap={4}>
          <Input.Header minHeight={0}>
            {messages.length === 0 && (
              <Input.HeaderItem>
                <ChatSuggestions />
              </Input.HeaderItem>
            )}
            {isLoading && (
              <Input.HeaderItem>
                <Typography variant="pi" textColor="neutral600">
                  Strapi AI is thinking...
                </Typography>
              </Input.HeaderItem>
            )}
          </Input.Header>
          <Input.Content disclaimer="Strapi AI can make errors.">
            <ChatInputAttachments />

            <Box paddingBottom={3}>
              <ResizableTextArea
                value={input}
                onChange={handleInputChange}
                onSubmit={handleSubmit}
                placeholder="Ask Strapi AI..."
              />
            </Box>
            <Input.Actions>
              <IconButton
                label="Import NextJS App"
                type="button"
                disabled={isLoading}
                onClick={() => setIsNextUploadModalOpen(true)}
              >
                <NextLogo size={16} />
              </IconButton>

              {isLoading ? (
                <IconButton label="Stop" type="button" variant="default" onClick={stop}>
                  <StopIcon />
                </IconButton>
              ) : (
                <IconButton label="Send" variant="default" disabled={input.trim().length === 0}>
                  <ArrowUp />
                </IconButton>
              )}
            </Input.Actions>
          </Input.Content>
        </Input.Root>
      </form>
    </>
  );
};

const Chat = () => {
  const { title, messages, isChatOpen, toggleChat, reset } = useStrapiChat();

  return (
    <Panel.Root
      size="md"
      position="bottom-right"
      isOpen={isChatOpen}
      onToggle={toggleChat}
      toggleIcon={<Sparkle />}
    >
      <Panel.Header>
        <Typography tag="h3" variant="omega" fontWeight="bold">
          {title}
        </Typography>
        <Flex gap={0}>
          <IconButton label="New conversation" variant="ghost" onClick={reset}>
            <Plus />
          </IconButton>
          <Panel.Close />
        </Flex>
      </Panel.Header>

      <Panel.Body>
        <ChatContent messages={messages} />
      </Panel.Body>

      <Panel.Footer>
        <ChatInput />
      </Panel.Footer>
    </Panel.Root>
  );
};

export { Chat };
