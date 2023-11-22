import * as React from 'react';

import { Button } from '@strapi/design-system';
import { ConfirmDialog } from '@strapi/helper-plugin';
import { Refresh } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { useRegenerate } from '../../../../hooks/useRegenerate';

interface RegenerateProps {
  onRegenerate?: () => void;
  idToRegenerate: string | number;
}

export const Regenerate = ({ onRegenerate = () => {}, idToRegenerate }: RegenerateProps) => {
  const { formatMessage } = useIntl();
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const { regenerateData, isLoadingConfirmation } = useRegenerate(
    '/admin/api-tokens/',
    idToRegenerate,
    onRegenerate
  );
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
        bodyText={{
          id: 'Settings.tokens.popUpWarning.message',
          defaultMessage: 'Are you sure you want to regenerate this token?',
        }}
        iconRightButton={<Refresh />}
        isConfirmButtonLoading={isLoadingConfirmation}
        isOpen={showConfirmDialog}
        onToggleDialog={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmRegeneration}
        leftButtonText={{
          id: 'Settings.tokens.Button.cancel',
          defaultMessage: 'Cancel',
        }}
        rightButtonText={{
          id: 'Settings.tokens.Button.regenerate',
          defaultMessage: 'Regenerate',
        }}
        title={{
          id: 'Settings.tokens.RegenerateDialog.title',
          defaultMessage: 'Regenerate token',
        }}
      />
    </>
  );
};
