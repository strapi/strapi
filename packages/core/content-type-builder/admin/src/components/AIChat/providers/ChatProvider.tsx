/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';

import { useChat } from '@ai-sdk/react';

import { useDataManager } from '../../DataManager/useDataManager';
import { useChatTitle } from '../hooks/useChatTitle';
import { transformMessages } from '../lib/transforms/messages';
import { transformCTBToChat } from '../lib/transforms/schemas/fromCTB';
import { Message } from '../lib/types/messages';

interface ChatContextType extends Omit<ReturnType<typeof useChat>, 'messages'> {
  title: string;
  messages: Message[];
  handleSubmit: (event: any) => void;
  isChatOpen: boolean;
  toggleChat: () => void;
  openChat: () => void;
  reset: () => void;
  files: FileList | undefined;
  setFiles: (files: FileList | undefined) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const generateRandomId = () => {
  return Math.random().toString(36).substring(2, 15);
};

export const ChatProvider = ({
  children,
  defaultOpen = false,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
}) => {
  const [chatId, setChatId] = useState<string | undefined>(undefined);
  const [isChatOpen, setIsChatOpen] = useState(defaultOpen);
  const [files, setFiles] = useState<FileList | undefined>(undefined);

  const { components, contentTypes } = useDataManager();

  const chat = useChat({
    id: chatId?.toString(),
    api: 'http://localhost:3001/chat',
    sendExtraMessageFields: true,
    experimental_throttle: 100,
    headers: {
      Authorization: `Bearer e22a341695db2bcf737b776b9efbc2c66997da7dde5b087db7166a1d749b7b479a723e6ab1e7288e`,
    },
  });

  /**================================================================================
   * AI SDK chat overrides
   *================================================================================*/

  // Messages are transformed into an easier to use format
  const messages = useMemo(() => {
    return transformMessages(chat.messages, chat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.messages]);

  const handleSubmit = async (event: Parameters<typeof chat.handleSubmit>[0]) => {
    const schemas = [
      ...Object.values(contentTypes)
        .filter((schema) => schema.status !== 'REMOVED')
        .filter((schema) => schema.uid !== 'plugin::users-permissions.user')
        .filter((schema) => schema.visible)
        .map(transformCTBToChat as any),
      ...Object.values(components)
        .filter((schema) => schema.status !== 'REMOVED')
        .map(transformCTBToChat as any),
    ];

    chat.handleSubmit(event, { experimental_attachments: files, body: { schemas } });
    setFiles(undefined);
  };

  /**=================================================================================
   * Chat title
   * =================================================================================*/
  const { title, generateTitle } = useChatTitle({ messages });

  // Automatically generate title when we have at least 1 message (user query)
  useEffect(() => {
    if (messages.length >= 1 && !title) {
      generateTitle();
    }
  }, [messages.length, title, generateTitle]);

  return (
    <ChatContext.Provider
      value={{
        ...chat,
        messages,
        handleSubmit,
        isChatOpen,
        toggleChat: () => setIsChatOpen(!isChatOpen),
        openChat: () => {
          setIsChatOpen(true);
        },
        reset: () => {
          chat.stop();
          setChatId(generateRandomId());
        },
        files,
        setFiles,
        // TODO: Translation
        title: title || 'New conversation',
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export function useStrapiChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useAppChat must be used within a ChatProvider');
  }
  return context;
}
