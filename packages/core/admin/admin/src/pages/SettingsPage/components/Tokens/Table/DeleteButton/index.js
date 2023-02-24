import React, { useState } from 'react';
import { Trash } from '@strapi/icons';
import { IconButton, Box } from '@strapi/design-system';
import { useTracking, ConfirmDialog } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';

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
