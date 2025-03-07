/**
 * Hook that requests a new title based on the first message
 */
import { useState, useCallback } from 'react';

import { Message } from '../lib/types/messages';

const CREATE_CHAT_URL = 'http://localhost:3001/generate-title';

interface UseChatTitleProps {
  messages: Message[];
}

export const useChatTitle = ({ messages }: UseChatTitleProps) => {
  const [title, setTitle] = useState<string | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<boolean>(false);

  const generateTitle = useCallback(async () => {
    const firstMessage = messages.at(0);

    // Only generate title if there are messages and no title yet
    if (!firstMessage || title || isGenerating || error) {
      return;
    }

    setIsGenerating(true);

    const firstMessageContent = firstMessage.contents
      .map((content) => (content.type === 'text' ? content.text : ''))
      .join('\n');

    try {
      const response = await fetch(CREATE_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer e22a341695db2bcf737b776b9efbc2c66997da7dde5b087db7166a1d749b7b479a723e6ab1e7288e`,
        },
        body: JSON.stringify({
          message: firstMessageContent,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();

      const generatedTitle = data.title;
      setTitle(generatedTitle);
    } catch (error) {
      console.error('Error generating chat title:', error);
      setError(true);
    } finally {
      setIsGenerating(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.at(0)?.id, isGenerating]);

  return {
    title,
    setTitle,
    generateTitle,
    isGenerating,
  };
};
