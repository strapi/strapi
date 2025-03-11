/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';

import { useChat } from '@ai-sdk/react';

import { useDataManager } from '../../DataManager/useDataManager';
import { FeedbackProvider } from '../FeedbackModal';
import { useAIChat } from '../hooks/useAIFetch';
import { useChatTitle } from '../hooks/useChatTitle';
import { STRAPI_AI_TOKEN } from '../lib/constants';
import { transformMessages } from '../lib/transforms/messages';
import { transformCTBToChat } from '../lib/transforms/schemas/fromCTB';
import { Attachment } from '../lib/types/attachments';
import { Message } from '../lib/types/messages';
import { Schema } from '../lib/types/schema';
import { UploadProjectToChatProvider } from '../UploadCodeModal';
import { UploadFigmaToChatProvider } from '../UploadFigmaModal';

import { SchemaChatProvider } from './SchemaProvider';

interface ChatContextType extends Omit<ReturnType<typeof useChat>, 'messages'> {
  isChatEnabled: boolean;
  title?: string;
  messages: Message[];
  rawMessages: ReturnType<typeof useChat>['messages'];
  handleSubmit: (event: any) => void;
  reset: () => void;
  schemas: Schema[];
  // Chat window
  isChatOpen: boolean;
  toggleChat: () => void;
  openChat: () => void;
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
  const [chatId, setChatId] = useState<string | undefined>(undefined);
  const [isChatOpen, setIsChatOpen] = useState(defaultOpen);

  // Files
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // DataManager
  const { components, contentTypes } = useDataManager();

  // Schemas to be sent to the chat
  const schemas = useMemo(() => {
    return [
      ...Object.values(contentTypes)
        .filter((schema) => schema.status !== 'REMOVED')
        .filter((schema) => schema.uid !== 'plugin::users-permissions.user')
        .filter((schema) => schema.visible)
        .map(transformCTBToChat as any),
      ...Object.values(components)
        .filter((schema) => schema.status !== 'REMOVED')
        .map(transformCTBToChat as any),
    ] as Schema[];
  }, [contentTypes, components]);

  const chat = useAIChat({
    id: chatId?.toString(),
    sendExtraMessageFields: true,
    experimental_throttle: 100,
    body: {
      schemas,
    },
  });

  /**================================================================================
   * AI SDK chat overrides
   *================================================================================*/

  // Messages are transformed into an easier to use format
  // TODO: Make this more efficient only computing new streamed parts
  const messages = useMemo(() => {
    return transformMessages(chat.messages, chat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.messages]);

  const handleSubmit = async (event: Parameters<typeof chat.handleSubmit>[0]) => {
    chat.handleSubmit(event, {
      experimental_attachments: attachments
        // Transform to ai/sdk format and remove any attachments that are not yet ready
        .filter((attachment) => attachment.status !== 'loading')
        .map((attachment) => ({
          name: attachment.name,
          url: attachment.url,
          contentType: attachment.contentType,
        })),
      allowEmptySubmit: true,
      body: { schemas },
    });
    setAttachments([]);
  };

  /**=================================================================================
   * Chat title
   * =================================================================================*/
  const { title, generateTitle, resetTitle } = useChatTitle({ chatId: chat.id, messages });

  // Automatically generate title when we have at least 1 message (user query)
  useEffect(() => {
    if (messages.length >= 1 && !title) {
      generateTitle();
    }
  }, [messages.length, title, generateTitle]);

  return (
    <ChatContext.Provider
      value={{
        isChatEnabled: !!STRAPI_AI_TOKEN,
        ...chat,
        messages,
        rawMessages: chat.messages,
        handleSubmit,
        reset: () => {
          chat.stop();
          setChatId(generateRandomId());
          resetTitle();
        },
        schemas,
        // Chat
        title,
        isChatOpen,
        toggleChat: () => setIsChatOpen(!isChatOpen),
        openChat: () => {
          setIsChatOpen(true);
        },
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
