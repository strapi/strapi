import React, { useState } from 'react';
import styled from 'styled-components';
import { get } from 'lodash';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Button } from '@strapi/design-system/Button';
import Refresh from '@strapi/icons/Refresh';
import { useNotification, ConfirmDialog } from '@strapi/helper-plugin';
import { axiosInstance } from '../../../../../../../core/utils';

const ButtonWithRightMargin = styled(Button)`
  margin-right: ${({ theme }) => theme.spaces[2]};
`;

export const Regenerate = ({ onRegenerate, idToRegenerate }) => {
  const toggleNotification = useNotification();
  const [isLoadingConfirmation, setIsLoadingConfirmation] = useState(false);
  const { formatMessage } = useIntl();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const handleConfirmRegeneration = async () => {
    setIsLoadingConfirmation(true);
    try {
      const {
        data: {
          data: { accessKey },
        },
      } = await axiosInstance.post(`/admin/api-tokens/${idToRegenerate}/regenerate`);
      setIsLoadingConfirmation(false);
      onRegenerate(accessKey);
      setShowConfirmDialog(false);
    } catch (error) {
      setIsLoadingConfirmation(false);
      toggleNotification({
        type: 'warning',
        message: get(error, 'response.data.message', 'notification.error'),
      });
    }
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
