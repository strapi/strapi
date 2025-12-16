import * as React from 'react';

import { Button, Dialog } from '@strapi/design-system';
import { ArrowClockwise } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { ConfirmDialog } from '../../../../../../components/ConfirmDialog';
import { useNotification } from '../../../../../../features/Notifications';
import { useAPIErrorHandler } from '../../../../../../hooks/useAPIErrorHandler';
import { useRegenerateServiceAccountMutation } from '../../../../../../services/serviceAccounts';

import type { Data } from '@strapi/types';

interface RegenerateServiceAccountProps {
  onRegenerate?: (newKey: string) => void;
  tokenId: Data.ID;
}

export const RegenerateServiceAccount = ({ onRegenerate, tokenId }: RegenerateServiceAccountProps) => {
  const { formatMessage } = useIntl();
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);

  const [isLoadingConfirmation, setIsLoadingConfirmation] = React.useState(false);
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  const [regenerateToken] = useRegenerateServiceAccountMutation();

  const regenerateData = async () => {
    try {
      setIsLoadingConfirmation(true);
      const res = await regenerateToken(tokenId);

      if ('error' in res) {
        toggleNotification({
          type: 'danger',
          message: formatAPIError(res.error),
        });

        return;
      }

      if (onRegenerate && res.data.accessKey) {
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
    await regenerateData();
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

