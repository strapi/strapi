import * as React from 'react';

import { Button, Flex, HeaderLayout } from '@strapi/design-system';
import { Check, Refresh } from '@strapi/icons';
import { MessageDescriptor, useIntl } from 'react-intl';

import { ConfirmDialog } from '../../../../components/ConfirmDialog';
import { BackButton } from '../../../../features/BackButton';
import { useNotification } from '../../../../features/Notifications';
import { useAPIErrorHandler } from '../../../../hooks/useAPIErrorHandler';
import { useRegenerateTokenMutation } from '../../../../services/api';

import type { Entity } from '@strapi/types';

interface RegenerateProps {
  onRegenerate?: (newKey: string) => void;
  url: string;
}

const Regenerate = ({ onRegenerate, url }: RegenerateProps) => {
  const { formatMessage } = useIntl();
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);

  const [isLoadingConfirmation, setIsLoadingConfirmation] = React.useState(false);
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  const [regenerateToken] = useRegenerateTokenMutation();

  const regenerateData = async () => {
    try {
      const res = await regenerateToken(url);

      if ('error' in res) {
        toggleNotification({
          type: 'danger',
          message: formatAPIError(res.error),
        });

        return;
      }

      if (onRegenerate) {
        onRegenerate(res.data.accessKey);
      }
    } catch (error) {
      toggleNotification({
        type: 'danger',
        message: formatMessage({
          id: 'notification.error',
          defaultMessage: 'Something went wrong',
        }),
      });
    } finally {
      setIsLoadingConfirmation(false);
    }
  };

  const handleConfirmRegeneration = async () => {
    regenerateData();
    setShowConfirmDialog(false);
  };

  return (
    <>
      <Button
        startIcon={<Refresh />}
        type="button"
        size="S"
        variant="tertiary"
        onClick={() => setShowConfirmDialog(true)}
        name="regenerate"
      >
        {formatMessage({
          id: 'Settings.tokens.regenerate',
          defaultMessage: 'Regenerate',
        })}
      </Button>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        title={formatMessage({
          id: 'Settings.tokens.RegenerateDialog.title',
          defaultMessage: 'Regenerate token',
        })}
        endAction={
          <Button
            startIcon={<Refresh />}
            loading={isLoadingConfirmation}
            onClick={handleConfirmRegeneration}
          >
            {formatMessage({
              id: 'Settings.tokens.Button.regenerate',
              defaultMessage: 'Regenerate',
            })}
          </Button>
        }
      >
        {formatMessage({
          id: 'Settings.tokens.popUpWarning.message',
          defaultMessage: 'Are you sure you want to regenerate this token?',
        })}
      </ConfirmDialog>
    </>
  );
};

interface Token {
  id: Entity.ID;
  name: string;
}

interface FormHeadProps<TToken extends Token | null> {
  title: MessageDescriptor;
  token: TToken;
  canEditInputs: boolean;
  canRegenerate: boolean;
  setToken: (token: TToken) => void;
  isSubmitting: boolean;
  regenerateUrl: string;
}

export const FormHead = <TToken extends Token | null>({
  title,
  token,
  setToken,
  canEditInputs,
  canRegenerate,
  isSubmitting,
  regenerateUrl,
}: FormHeadProps<TToken>) => {
  const { formatMessage } = useIntl();
  const handleRegenerate = (newKey: string) => {
    setToken({
      ...token,
      accessKey: newKey,
    });
  };

  return (
    <HeaderLayout
      title={token?.name || formatMessage(title)}
      primaryAction={
        canEditInputs ? (
          <Flex gap={2}>
            {canRegenerate && token?.id && (
              <Regenerate
                onRegenerate={handleRegenerate}
                url={`${regenerateUrl}${token?.id ?? ''}`}
              />
            )}
            <Button
              disabled={isSubmitting}
              loading={isSubmitting}
              startIcon={<Check />}
              type="submit"
              size="S"
            >
              {formatMessage({
                id: 'global.save',
                defaultMessage: 'Save',
              })}
            </Button>
          </Flex>
        ) : (
          canRegenerate &&
          token?.id && (
            <Regenerate
              onRegenerate={handleRegenerate}
              url={`${regenerateUrl}${token?.id ?? ''}`}
            />
          )
        )
      }
      navigationAction={<BackButton />}
      ellipsis
    />
  );
};
