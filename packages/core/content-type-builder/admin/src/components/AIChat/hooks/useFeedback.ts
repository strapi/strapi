import { useState } from 'react';

import { useNotification } from '@strapi/admin/strapi-admin';

import { useCTBTracking } from '../../CTBSession/ctbSession';
import { useStrapiChat } from '../providers/ChatProvider';

import { FeedbackReasonIds, useFetchSendFeedback } from './useAIFetch';
import { useTranslations } from './useTranslations';

export const useFeedback = () => {
  const { fetch: sendFeedback, isPending, error } = useFetchSendFeedback();
  const { id, messages, schemas } = useStrapiChat();
  const { toggleNotification } = useNotification();
  const { trackUsage } = useCTBTracking();
  const { t } = useTranslations();

  // Keep track of messages that have received feedback
  const [votedMessages, setVotedMessages] = useState<Record<string, 'upvote' | 'downvote'>>({});

  const hasVoted = (messageId: string) => {
    return !!votedMessages[messageId];
  };

  const upvoteMessage = (messageId: string) => {
    // Prevent spamming upvote
    if (hasVoted(messageId)) {
      return Promise.resolve();
    }

    trackUsage('didVoteAnswer', {
      value: 'positive',
    });

    toggleNotification({
      type: 'success',
      message: t('chat.feedback.submitted', 'Thank you for your feedback! '),
    });

    // Record this message as upvoted
    setVotedMessages((prev) => ({ ...prev, [messageId]: 'upvote' }));

    return sendFeedback({
      body: {
        type: 'upvote',
        chatId: id,
        messageId,
        messages,
        schemas,
      },
    });
  };

  const downvoteMessage = (messageId: string, feedback: string, reasons: FeedbackReasonIds[]) => {
    trackUsage('didVoteAnswer', {
      value: 'negative',
    });

    toggleNotification({
      type: 'success',
      message: t('chat.feedback.submitted', 'Thank you for your feedback! '),
    });

    return sendFeedback({
      body: {
        type: 'downvote',
        chatId: id,
        messageId,
        messages,
        feedback,
        reasons,
        schemas,
      },
    });
  };

  return { upvoteMessage, downvoteMessage, isPending, error };
};
