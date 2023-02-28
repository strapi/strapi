import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Button } from '@strapi/design-system';
import { Refresh } from '@strapi/icons';
import { ConfirmDialog } from '@strapi/helper-plugin';
import { useRegenerate } from '../../../../../../../hooks';

export const Regenerate = ({ onRegenerate, idToRegenerate }) => {
  const { formatMessage } = useIntl();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
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

Regenerate.defaultProps = { onRegenerate() {} };

Regenerate.propTypes = {
  onRegenerate: PropTypes.func,
  idToRegenerate: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
};

export default Regenerate;
