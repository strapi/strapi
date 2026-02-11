/**
 * Hook that requests a new title based on the first message
 */
import { useState, useCallback } from 'react';

import { useFetchGenerateTitle } from './useAIFetch';

import type { UIMessage } from '@ai-sdk/react';

interface UseChatTitleProps {
  chatId: string;
  messages: UIMessage[];
}

export const useChatTitle = ({ chatId, messages }: UseChatTitleProps) => {
  const [title, setTitle] = useState<string | undefined>(undefined);

  // Use the endpoint-specific hook
  const { fetch: fetchGenerateTitle, error, isPending: isGenerating } = useFetchGenerateTitle();

  const generateTitle = useCallback(async () => {
    const firstMessage = messages.at(0);

    // Only generate title if there are messages and no title yet
    if (!firstMessage || title || isGenerating || error) {
      return;
    }

    const firstMessageContent = firstMessage.parts
      .map((content) => (content.type === 'text' ? content.text : ''))
      .join('\n');

    const result = await fetchGenerateTitle({
      body: { chatId, message: firstMessageContent },
    });

    if (result?.data) {
      setTitle(result.data.title);
    }
  }, [messages, title, isGenerating, error, fetchGenerateTitle, chatId]);

  const resetTitle = useCallback(() => {
    setTitle(undefined);
  }, []);

  return {
    title,
    isGenerating,
    error,
    generateTitle,
    resetTitle,
  };
};
