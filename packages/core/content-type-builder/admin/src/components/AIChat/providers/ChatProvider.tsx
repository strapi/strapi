/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
  type ChangeEvent,
} from 'react';

import { UIMessage, useChat } from '@ai-sdk/react';
import { useAIAvailability } from '@strapi/admin/strapi-admin/ee';

import { useCTBTracking } from '../../CTBSession/ctbSession';
import { useDataManager } from '../../DataManager/useDataManager';
import { FeedbackProvider } from '../FeedbackModal';
import { useAIChat } from '../hooks/useAIFetch';
import { useChatTitle } from '../hooks/useChatTitle';
import { useLastSeenSchemas } from '../hooks/useLastSeenSchemas';
import { transformCTBToChat } from '../lib/transforms/schemas/fromCTB';
import { Attachment } from '../lib/types/attachments';
import { Schema } from '../lib/types/schema';
import { UploadProjectToChatProvider } from '../UploadCodeModal';
import { UploadFigmaToChatProvider } from '../UploadFigmaModal';

import { SchemaChatProvider } from './SchemaProvider';

interface ChatContextType extends Omit<ReturnType<typeof useChat>, 'messages'> {
  isChatEnabled: boolean;
  title?: string;
  messages: UIMessage[];
  handleSubmit: (event: any) => void;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  handleInputChange: (e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>) => void;
  reset: () => void;
  schemas: Schema[];
  // Chat window
  isChatOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  // Attachments
  attachments: Attachment[];
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const generateRandomId = () => {
  return Math.random().toString(36).substring(2, 15);
};

export const BaseChatProvider = ({
  children,
  defaultOpen = false,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
}) => {
  const [chatId, setChatId] = useState<string | undefined>(generateRandomId());
  const [isChatOpen, setIsChatOpen] = useState(defaultOpen);
  const [openCount, setOpenCount] = useState(0);
  const [input, setInput] = useState('');

  // Files
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const { trackUsage } = useCTBTracking();

  // DataManager
  const { components, contentTypes } = useDataManager();

  // Last user seen schemas
  const { lastSeenSchemas } = useLastSeenSchemas();

  // Schemas to be sent to the chat
  const schemas = useMemo(() => {
    return [
      ...Object.values(contentTypes)
        .filter((schema) => schema.status !== 'REMOVED')
        // Probably we should still keep this one, not sure
        .filter((schema) => schema.uid !== 'plugin::users-permissions.user')
        .filter((schema) => schema.visible)
        .map(transformCTBToChat as any),
      ...Object.values(components)
        .filter((schema) => schema.status !== 'REMOVED')
        .map(transformCTBToChat as any),
    ] as Schema[];
  }, [contentTypes, components]);

  const {
    id,
    messages,
    sendMessage: _sendMessage,
    status,
    stop,
    ...chat
  } = useAIChat({
    id: chatId?.toString(),
    experimental_throttle: 100,
  });

  /* -------------------------------------------------------------------------------------------------
   * AI SDK chat overrides
   * -----------------------------------------------------------------------------------------------*/

  // NOTE: body is using state variables, so they can not be passed as a prop in useChat
  const sendMessage: typeof _sendMessage = async (message, options) => {
    if (status === 'streaming' || status === 'submitted') {
      return;
    }

    return _sendMessage(message, {
      ...options,
      body: {
        ...options?.body,
        schemas,
        metadata: {
          lastSeenSchemas: lastSeenSchemas.map((schema) => schema.uid),
        },
      },
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (status === 'streaming' || status === 'submitted') {
      return;
    }

    const readyAttachments = attachments.filter((a) => a.status !== 'loading');
    if (input.trim().length === 0 && attachments.length === 0) {
      return;
    }

    const files = readyAttachments.map(
      (attachment) =>
        ({
          type: 'file',
          filename: attachment.filename,
          mediaType: attachment.mediaType,
          url: attachment.url,
        }) as const
    );
    sendMessage({ text: input, files });
    setInput('');
    setAttachments([]);
  };

  /* -------------------------------------------------------------------------------------------------
   * Chat title
   * -----------------------------------------------------------------------------------------------*/
  const { title, generateTitle, resetTitle } = useChatTitle({ chatId: id, messages });

  // Automatically generate title when we have at least 1 message (user query)
  useEffect(() => {
    if (messages.length >= 1 && !title) {
      generateTitle();
    }
  }, [messages.length, title, generateTitle]);

  useEffect(() => {
    if (status === 'error') {
      trackUsage('didAnswerMessage', {
        successful: false,
      });
    } else if (
      status === 'ready' &&
      messages.length > 0 &&
      messages[messages.length - 1]?.role === 'assistant'
    ) {
      trackUsage('didAnswerMessage', {
        successful: true,
      });
    }
  }, [status, messages, trackUsage]);

  const isChatAvailable = useAIAvailability();

  return (
    <ChatContext.Provider
      value={{
        isChatEnabled: isChatAvailable,
        id,
        status,
        stop,
        sendMessage,
        ...chat,
        messages,
        handleSubmit,
        input,
        setInput,
        handleInputChange: (e) => setInput(e.target.value),
        reset: () => {
          stop();
          setChatId(generateRandomId());
          trackUsage('didStartNewChat');
          resetTitle();
        },
        schemas,
        // Chat
        title,
        isChatOpen,
        openChat: () => {
          setIsChatOpen(true);
          // if this is the first open, it's a new chat
          if (openCount === 0) {
            trackUsage('didStartNewChat');
          }
          setOpenCount((prev) => prev + 1);
        },
        closeChat: () => setIsChatOpen(false),
        // Attachments
        attachments,
        setAttachments,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const ChatProvider = ({
  children,
  defaultOpen = false,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  return (
    <BaseChatProvider defaultOpen={defaultOpen}>
      <SchemaChatProvider>
        <UploadProjectToChatProvider>
          <UploadFigmaToChatProvider>
            <FeedbackProvider>{children}</FeedbackProvider>
          </UploadFigmaToChatProvider>
        </UploadProjectToChatProvider>
      </SchemaChatProvider>
    </BaseChatProvider>
  );
};

export function useStrapiChat() {
  const context = useContext(ChatContext);

  if (process.env.NODE_ENV === 'development') {
    // In development, provide a fallback to prevent crashes during hot reloading
    // This allows the app to continue working during HMR updates
    if (context === undefined) {
      console.warn(
        'useStrapiChat was called outside of ChatProvider. This is only allowed in development mode.'
      );
      return {} as ChatContextType;
    }
  } else if (context === undefined) {
    throw new Error('useStrapiChat must be used within a ChatProvider');
  }
  return context;
}
