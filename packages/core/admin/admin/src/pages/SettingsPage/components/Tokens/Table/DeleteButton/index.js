import React, { useState } from 'react';

import { Box, IconButton } from '@strapi/design-system';
import { ConfirmDialog, useTracking } from '@strapi/helper-plugin';
import { Trash } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

const DeleteButton = ({ tokenName, onClickDelete, tokenType }) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const handleClickDelete = () => {
    setShowConfirmDialog(false);
    trackUsage('willDeleteToken', {
      tokenType,
    });
    onClickDelete();
  };

  return (
    <Box paddingLeft={1} onClick={(e) => e.stopPropagation()}>
      <IconButton
        onClick={() => {
          setShowConfirmDialog(true);
        }}
        label={formatMessage(
          {
            id: 'global.delete-target',
            defaultMessage: 'Delete {target}',
          },
          { target: `${tokenName}` }
        )}
        name="delete"
        noBorder
        icon={<Trash />}
      />
      <ConfirmDialog
        onToggleDialog={() => setShowConfirmDialog(false)}
        onConfirm={handleClickDelete}
        isOpen={showConfirmDialog}
      />
    </Box>
  );
};

DeleteButton.propTypes = {
  tokenName: PropTypes.string.isRequired,
  onClickDelete: PropTypes.func.isRequired,
  tokenType: PropTypes.string.isRequired,
};

export default DeleteButton;
