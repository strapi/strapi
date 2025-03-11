import { useEffect, useRef, useState } from 'react';

import { Flex, IconButton, Button, Typography, Box } from '@strapi/design-system';
import { Sparkle, ArrowUp, Plus, Paperclip, Upload, Code } from '@strapi/icons';
import { styled } from 'styled-components';

import { Alert } from './components/Alert';
import { AnimatedBox } from './components/AnimatedBox';
import { AttachmentPreview } from './components/Attachments/AttachmentPreview';
import { Dropzone } from './components/Dropzone';
import { Panel } from './components/FloatingPanel';
import { FigmaIcon } from './components/icons/FigmaIcon';
import { StopIcon } from './components/icons/StopIcon';
import { Input } from './components/Input';
import { ChatMessage } from './components/Messages/Message';
import { ResizableTextArea } from './components/ResizableTextArea';
import { MenuItem, SimpleMenu } from './components/SimpleMenu';
import {
  CHAT_TOO_LONG_ERROR,
  LICENSE_LIMIT_REACHED_ERROR,
  TOO_MANY_REQUESTS_ERROR,
} from './hooks/useAIFetch';
import { useAttachments } from './hooks/useAttachments';
import { useTranslations } from './hooks/useTranslations';
import { Message } from './lib/types/messages';
import { useStrapiChat } from './providers/ChatProvider';
import { useUploadProjectToChat } from './UploadCodeModal';
import { UploadFigmaModal, useUploadFigmaToChat } from './UploadFigmaModal';

/* -------------------------------------------------------------------------------------------------
 * Chat Message Suggestions
 * -----------------------------------------------------------------------------------------------*/
const ResponsiveFlex = styled(Flex)`
  @media (max-height: 500px) {
    display: none;
  }
`;

const ChatSuggestions = () => {
  const { append } = useStrapiChat();
  const { t } = useTranslations();

  const SUGGESTIONS = [
    t('chat.input.defaults.generate', 'Generate a product schema'),
    t('chat.input.defaults.ctb', 'Tell me about the Content-Type Builder'),
    t('chat.input.defaults.strapi', 'Tell me about Strapi'),
  ] as const;

  const suggestionsTitle = t('chat.input.defaults.title', 'How can I help you?');

  return (
    <AnimatedBox>
      <ResponsiveFlex direction="column" alignItems={'flex-start'} gap={3}>
        <Typography variant="omega" fontWeight="bold">
          {suggestionsTitle}
        </Typography>
        <Flex direction="column" alignItems={'flex-start'} gap={2}>
          {SUGGESTIONS.map((suggestion) => (
            <Button
              key={suggestion}
              startIcon={<Sparkle fill="neutral500" />}
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
      </ResponsiveFlex>
    </AnimatedBox>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Chat Errors
 * -----------------------------------------------------------------------------------------------*/
const getErrorMessage = (err: Error) => {
  try {
    const error = JSON.parse(err.message);
    return error.error;
  } catch (e) {
    return err;
  }
};

const ChatError = () => {
  const { error } = useStrapiChat();
  const { t } = useTranslations();

  const defaultErrorMessage = t('chat.messages.error', 'Something went wrong.');
  const tooManyRequestsMessage = t(
    'chat.messages.too-many-requests',
    'Too many requests, please try again later.'
  );
  const licenseLimitReachedMessage = t(
    'chat.messages.license-limit-reached',
    'License limit reached, please try again tomorrow.'
  );
  const chatTooLongError = t(
    'chat.messages.too-long-error',
    'This conversation reached its maximum length. Start a new conversation'
  );

  if (!error) return null;

  const errorMessage = getErrorMessage(error);
  if (errorMessage === TOO_MANY_REQUESTS_ERROR) {
    return <Alert title={tooManyRequestsMessage} variant="warning" />;
  }

  if (errorMessage === LICENSE_LIMIT_REACHED_ERROR) {
    return <Alert title={licenseLimitReachedMessage} variant="warning" />;
  }

  if (errorMessage === CHAT_TOO_LONG_ERROR) {
    return <Alert title={chatTooLongError} variant="danger" />;
  }

  return <Alert title={defaultErrorMessage} variant="danger" />;
};

/* -------------------------------------------------------------------------------------------------
 * Chat Messages
 * -----------------------------------------------------------------------------------------------*/
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
      {status === 'error' && <ChatError />}
      <div ref={messageEndRef} />
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Attachments
 * -----------------------------------------------------------------------------------------------*/
const ChatAttachmentList = () => {
  const { attachments, removeAttachmentByIndex } = useAttachments();

  if (!attachments.length) return null;

  return (
    <Input.Attachments>
      {attachments.map((attachment, index) => (
        <Box key={attachment.name} maxWidth={'250px'}>
          <AttachmentPreview
            attachment={attachment}
            onRemove={() => removeAttachmentByIndex(index)}
          />
        </Box>
      ))}
    </Input.Attachments>
  );
};

const ChatAttachmentMenu = () => {
  const { attachFiles } = useAttachments();
  const { openCodeUpload } = useUploadProjectToChat();
  const { openFigmaUpload } = useUploadFigmaToChat();
  const { t } = useTranslations();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadLabel = t('chat.tooltips.upload-attachments', 'Upload attachments');
  const importCodeText = t('chat.attachments.menu.import-code', 'Import code');
  const attachImageText = t('chat.attachments.menu.attach-image', 'Attach image');
  const importFigmaText = t('chat.attachments.menu.import-figma', 'Import from Figma');

  return (
    <SimpleMenu
      label={uploadLabel}
      icon={<Paperclip />}
      tag={IconButton}
      popoverPlacement="top-end"
    >
      <MenuItem startIcon={<Code />} onSelect={() => openCodeUpload()}>
        {importCodeText}
      </MenuItem>

      <MenuItem startIcon={<FigmaIcon />} onSelect={() => openFigmaUpload()}>
        {importFigmaText}
      </MenuItem>

      <input type="file" accept="image/*" multiple hidden ref={fileInputRef} />
      <MenuItem
        startIcon={<Upload />}
        onSelect={() => {
          const fileInput = fileInputRef.current;
          if (!fileInput) return;
          fileInput.onchange = (e) => {
            const target = e.target as HTMLInputElement;
            if (target.files && target.files.length > 0) {
              attachFiles(Array.from(target.files));
            }
          };

          fileInput.click();
        }}
      >
        {attachImageText}
      </MenuItem>
    </SimpleMenu>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Input
 * -----------------------------------------------------------------------------------------------*/

const LoadingDots = ({ children }: { children: string }) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const dotStates = ['', '.', '..', '...'];
    let currentIndex = 0;

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % dotStates.length;
      setDots(dotStates[currentIndex]);
    }, 400); // Change every 400ms for a nice rhythm

    return () => clearInterval(interval);
  }, []);

  return (
    <Typography variant="pi" textColor="neutral600">
      {children}
      {dots}
    </Typography>
  );
};

const ChatInput = (props: any) => {
  const { input, handleSubmit, handleInputChange, messages, status, stop, attachments } =
    useStrapiChat();
  const { t } = useTranslations();

  const isLoading = status === 'streaming' || status === 'submitted';

  return (
    <>
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
                <LoadingDots>{t('chat.input.thinking', 'Strapi AI is thinking')}</LoadingDots>
              </Input.HeaderItem>
            )}
          </Input.Header>
          <Input.Content>
            <Dropzone.Area />
            <ChatAttachmentList />
            <Box paddingBottom={3}>
              <ResizableTextArea
                value={input}
                onChange={handleInputChange}
                onSubmit={handleSubmit}
                placeholder={t('chat.input.placeholder', 'Ask Strapi AI...')}
              />
            </Box>
            <Input.Actions>
              <ChatAttachmentMenu />

              {isLoading ? (
                <IconButton
                  label={t('chat.tooltips.stop-generation', 'Stop')}
                  type="button"
                  variant="default"
                  onClick={(e) => {
                    e.preventDefault();
                    stop();
                  }}
                >
                  <StopIcon />
                </IconButton>
              ) : (
                <IconButton
                  label={t('chat.tooltips.send-message', 'Send')}
                  variant="default"
                  // allow sending an empty message if there are attachments
                  disabled={input.trim().length === 0 && attachments.length === 0}
                >
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

/* -------------------------------------------------------------------------------------------------
 * Chat
 * -----------------------------------------------------------------------------------------------*/

const Chat = () => {
  const { title, messages, isChatOpen, isChatEnabled, toggleChat, reset } = useStrapiChat();
  const { attachFiles } = useAttachments();
  const { t } = useTranslations();

  // Labels
  const openChatLabel = t('chat.tooltips.open-chat', 'Open chat');
  const closeChatLabel = t('chat.tooltips.close-chat', 'Close chat');
  const createChatLabel = t('chat.tooltips.create-chat', 'New conversation');
  const defaultTitle = t('chat.header.default-title', 'New conversation');
  const mistakesDisclaimer = t(
    'chat.input.strapi-ai-can-make-errors',
    'Strapi AI can make mistakes.'
  );

  if (!isChatEnabled) {
    return null;
  }

  return (
    <Dropzone.Root
      onAddFiles={(files) => {
        attachFiles(files);
      }}
    >
      <UploadFigmaModal />
      <Panel.Root
        size="md"
        position="bottom-right"
        isOpen={isChatOpen}
        onToggle={toggleChat}
        toggleIcon={
          <IconButton
            onClick={toggleChat}
            label={isChatOpen ? closeChatLabel : openChatLabel}
            variant="default"
          >
            <Sparkle />
          </IconButton>
        }
      >
        <Panel.Header>
          <Typography tag="h3" variant="omega" fontWeight="bold">
            {title || defaultTitle}
          </Typography>
          <Flex gap={0}>
            <IconButton label={createChatLabel} variant="ghost" onClick={reset}>
              <Plus />
            </IconButton>
            <Panel.Close label={closeChatLabel} />
          </Flex>
        </Panel.Header>

        <Panel.Body>
          {!messages.length ? (
            <Typography variant="pi" textColor="neutral600">
              {mistakesDisclaimer}
            </Typography>
          ) : null}
          <ChatContent messages={messages} />
        </Panel.Body>

        <Panel.Footer>
          <ChatInput />
        </Panel.Footer>
      </Panel.Root>
    </Dropzone.Root>
  );
};

export { Chat };
