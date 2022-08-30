import React, { useState } from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Button } from '@strapi/design-system/Button';
import Refresh from '@strapi/icons/Refresh';
import { ConfirmDialog } from '@strapi/helper-plugin';
import { useRegenerate } from '../../../../../../../hooks';

const ButtonWithRightMargin = styled(Button)`
  margin-right: ${({ theme }) => theme.spaces[2]};
`;

export const Regenerate = ({ onRegenerate, idToRegenerate }) => {
  const { formatMessage } = useIntl();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { regenerateData, isLoadingConfirmation } = useRegenerate(idToRegenerate, onRegenerate);
  const handleConfirmRegeneration = async () => {
    regenerateData();
    setShowConfirmDialog(false);
  };

  return (
    <>
      <ButtonWithRightMargin
        startIcon={<Refresh />}
        type="button"
        size="S"
        variant="tertiary"
        onClick={() => setShowConfirmDialog(true)}
      >
        {formatMessage({
          id: 'Settings.apiTokens.regenerate',
          defaultMessage: 'Regenerate',
        })}
      </ButtonWithRightMargin>

      <ConfirmDialog
        bodyText={{
          id: 'Settings.apiTokens.popUpWarning.message',
          defaultMessage: 'Are you sure you want to regenerate this token?',
        }}
        iconRightButton={<Refresh />}
        isConfirmButtonLoading={isLoadingConfirmation}
        isOpen={showConfirmDialog}
        onToggleDialog={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmRegeneration}
        leftButtonText={{
          id: 'Settings.apiTokens.Button.cancel',
          defaultMessage: 'Cancel',
        }}
        rightButtonText={{
          id: 'Settings.apiTokens.Button.regenerate',
          defaultMessage: 'Regenerate',
        }}
        title={{
          id: 'Settings.apiTokens.RegenerateDialog.title',
          defaultMessage: 'Regenerate token',
        }}
      />
    </>
  );
};

Regenerate.defaultProps = { onRegenerate() {} };

Regenerate.propTypes = {
  onRegenerate: PropTypes.func,
  idToRegenerate: PropTypes.string.isRequired,
};

export default Regenerate;
