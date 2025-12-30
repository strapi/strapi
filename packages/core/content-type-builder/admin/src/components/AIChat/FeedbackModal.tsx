import * as React from 'react';
import { createContext, useContext, useState } from 'react';

import { useNotification } from '@strapi/admin/strapi-admin';
import {
  Box,
  Flex,
  Typography,
  Textarea,
  Button,
  Grid,
  Checkbox,
  Modal,
} from '@strapi/design-system';
import { styled } from 'styled-components';

import { useFeedback } from './hooks/useFeedback';
import { useTranslations } from './hooks/useTranslations';

import type { FeedbackReasonIds } from './lib/types/feedback';

/* -------------------------------------------------------------------------------------------------
 * Provider
 * -----------------------------------------------------------------------------------------------*/
interface FeedbackModalContextType {
  isFeedbackModalOpen: boolean;
  currentMessageId: string | null;
  openFeedbackModal: (messageId: string) => void;
  closeFeedbackModal: () => void;
}

const FeedbackModalContext = createContext<FeedbackModalContextType>({
  isFeedbackModalOpen: false,
  currentMessageId: null,
  openFeedbackModal: () => {},
  closeFeedbackModal: () => {},
});

export const useFeedbackModal = () => useContext(FeedbackModalContext);

export const FeedbackProvider = ({ children }: { children: React.ReactNode }) => {
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);

  const openFeedbackModal = (messageId: string) => {
    setCurrentMessageId(messageId);
    setIsFeedbackModalOpen(true);
  };

  const closeFeedbackModal = () => {
    setIsFeedbackModalOpen(false);
    setCurrentMessageId(null);
  };

  return (
    <FeedbackModalContext.Provider
      value={{ isFeedbackModalOpen, currentMessageId, openFeedbackModal, closeFeedbackModal }}
    >
      {isFeedbackModalOpen && currentMessageId && <FeedbackModal />}
      {children}
    </FeedbackModalContext.Provider>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Feedback Option
 * -----------------------------------------------------------------------------------------------*/

interface FeedbackOptionProps {
  id: FeedbackReasonIds;
  label: string;
  selected: boolean;
  onClick: (id: FeedbackReasonIds) => void;
}

const FeedbackOptionWrapper = styled(Flex)`
  &:hover {
    background-color: ${({ theme }) => theme.colors.neutral100};
  }

  &.selected {
    background-color: ${({ theme }) => theme.colors.primary100};
    border-color: ${({ theme }) => theme.colors.primary200};
  }
`;

const FeedbackOption: React.FC<FeedbackOptionProps> = ({ id, label, selected, onClick }) => {
  return (
    <FeedbackOptionWrapper
      className={selected ? 'selected' : ''}
      justifyContent="space-between"
      hasRadius
      width="100%"
      cursor="pointer"
      borderColor="neutral200"
      padding={3}
      gap={3}
      onClick={() => onClick(id)}
    >
      <Typography variant="omega" fontWeight="bold">
        {label}
      </Typography>
      <Checkbox
        name={`feedback-${id}`}
        value={id}
        checked={selected}
        onChange={() => onClick(id)}
      />
    </FeedbackOptionWrapper>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Modal
 * -----------------------------------------------------------------------------------------------*/

export const FeedbackModal: React.FC = () => {
  const [feedbackText, setFeedbackText] = useState('');
  const [selectedReasons, setSelectedReasons] = useState<FeedbackReasonIds[]>([]);

  const { t } = useTranslations();
  const { toggleNotification } = useNotification();
  const { closeFeedbackModal, currentMessageId } = useFeedbackModal();
  const { downvoteMessage, isPending } = useFeedback();

  const feedbackReasons = [
    {
      id: 'invalid_schema',
      label: t('chat.feedback.reason.invalid_schema', 'Invalid schema'),
    },
    {
      id: 'bad_recommendation',
      label: t('chat.feedback.reason.bad_recommendation', 'Bad recommendation'),
    },
    {
      id: 'slow',
      label: t('chat.feedback.reason.slow', 'Slow'),
    },
    {
      id: 'instructions_ignored',
      label: t('chat.feedback.reason.instructions_ignored', 'Instructions ignored'),
    },
    {
      id: 'being_lazy',
      label: t('chat.feedback.reason.being_lazy', 'Being lazy'),
    },
    {
      id: 'other',
      label: t('chat.feedback.reason.other', 'Other'),
    },
  ] satisfies { id: FeedbackReasonIds; label: string }[];

  const handleReasonSelect = (id: FeedbackReasonIds) => {
    setSelectedReasons((prevSelected) => {
      // If already selected, remove it
      if (prevSelected.includes(id)) {
        return prevSelected.filter((reasonId) => reasonId !== id);
      }
      // Otherwise add it
      return [...prevSelected, id];
    });
  };

  const handleSubmitFeedback = async () => {
    if (selectedReasons.length === 0) return;

    try {
      await downvoteMessage(currentMessageId as string, feedbackText, selectedReasons);

      setFeedbackText('');
      setSelectedReasons([]);
      closeFeedbackModal();
    } catch (error) {
      toggleNotification({
        type: 'danger',
        message: t('chat.feedback.error', 'An error occurred while submitting your feedback'),
      });
    }
  };

  return (
    <Modal.Root open onOpenChange={closeFeedbackModal}>
      <Modal.Content>
        <Modal.Header>
          <Typography variant="omega" fontWeight="bold">
            {t('chat.feedback.title', 'Give feedback')}
          </Typography>
        </Modal.Header>
        <Modal.Body>
          <Flex direction="column" alignItems="start" gap={6} width="100%">
            <Flex direction="column" alignItems="start" gap={2}>
              <Typography variant="beta" fontWeight="bold">
                {t('chat.feedback.title', 'Give feedback')}
              </Typography>
              <Typography variant="omega">
                {t(
                  'chat.feedback.subtitle',
                  'Provide additional feedback on this message. Select all that apply.'
                )}
              </Typography>
            </Flex>
            <Grid.Root width="100%" gap={2}>
              {feedbackReasons.map((reason) => (
                <Grid.Item key={reason.id} col={6} xs={12}>
                  <FeedbackOption
                    key={reason.id}
                    id={reason.id}
                    label={reason.label}
                    selected={selectedReasons.includes(reason.id)}
                    onClick={handleReasonSelect}
                  />
                </Grid.Item>
              ))}
            </Grid.Root>
            <Flex direction="column" gap={2} width="100%" alignItems="start">
              <Typography variant="omega">
                {t('chat.feedback.comment.label', 'How can we improve? (optional)')}
              </Typography>
              <Box width="100%">
                <Textarea
                  name="feedback"
                  placeholder={t('chat.feedback.placeholder', 'Your feedback...')}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  value={feedbackText}
                />
              </Box>
            </Flex>
          </Flex>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <Button variant="tertiary" onClick={closeFeedbackModal}>
              {t('form.button.cancel', 'Cancel')}
            </Button>
          </Modal.Close>
          <Button
            onClick={handleSubmitFeedback}
            loading={isPending}
            disabled={selectedReasons.length === 0}
          >
            {t('form.button.submit', 'Submit')}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};
