import * as React from 'react';

import { Button, Dialog, Flex, Tooltip } from '@strapi/design-system';
import { Check, ArrowClockwise, Eye, EyeStriked } from '@strapi/icons';
import { MessageDescriptor, useIntl } from 'react-intl';

import { ConfirmDialog } from '../../../../components/ConfirmDialog';
import { Layouts } from '../../../../components/Layouts/Layout';
import { BackButton } from '../../../../features/BackButton';
import { useNotification } from '../../../../features/Notifications';
import { useAPIErrorHandler } from '../../../../hooks/useAPIErrorHandler';
import { useRegenerateTokenMutation } from '../../../../services/transferTokens';

import type { Data } from '@strapi/types';

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
    <Dialog.Root open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
      <Dialog.Trigger>
        <Button
          startIcon={<ArrowClockwise />}
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
      </Dialog.Trigger>

      <ConfirmDialog
        title={formatMessage({
          id: 'Settings.tokens.RegenerateDialog.title',
          defaultMessage: 'Regenerate token',
        })}
        endAction={
          <Button
            startIcon={<ArrowClockwise />}
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
    </Dialog.Root>
  );
};

interface Token {
  id: Data.ID;
  name: string;
}

interface FormHeadProps<TToken extends Token | null> {
  title: MessageDescriptor;
  token: TToken;
  canEditInputs: boolean;
  canRegenerate: boolean;
  canShowToken?: boolean;
  setToken: (token: TToken) => void;
  toggleToken?: () => void;
  showToken?: boolean;
  isSubmitting: boolean;
  regenerateUrl: string;
}

export const FormHead = <TToken extends Token | null>({
  title,
  token,
  setToken,
  toggleToken,
  showToken,
  canShowToken,
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
    toggleToken?.();
  };

  return (
    <Layouts.Header
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
            {token?.id && toggleToken && (
              <Tooltip
                label={
                  !canShowToken &&
                  formatMessage({
                    id: 'Settings.tokens.encryptionKeyMissing',
                    defaultMessage:
                      'In order to view the token, you need a valid encryption key in the admin configuration',
                  })
                }
              >
                <Button
                  type="button"
                  startIcon={showToken ? <EyeStriked /> : <Eye />}
                  variant="secondary"
                  onClick={() => toggleToken?.()}
                  disabled={!canShowToken}
                >
                  {formatMessage({
                    id: 'Settings.tokens.viewToken',
                    defaultMessage: 'View token',
                  })}
                </Button>
              </Tooltip>
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
