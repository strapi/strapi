import React, { useState } from 'react';
import Trash from '@strapi/icons/Trash';
import { IconButton } from '@strapi/design-system/IconButton';
import { Box } from '@strapi/design-system/Box';
import { stopPropagation, useTracking } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import DeleteTokenDialog from '../../DeleteTokenDialog';

const DeleteButton = ({ tokenName, onClickDelete }) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking(); // TODO: Track different types of tokens
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const handleClickDelete = () => {
    setShowConfirmDialog(false);
    trackUsage('willDeleteToken');
    onClickDelete();
  };

  return (
    <Box paddingLeft={1} {...stopPropagation}>
      <IconButton
        onClick={() => setShowConfirmDialog(true)}
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
      <DeleteTokenDialog
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleClickDelete}
        isOpen={showConfirmDialog}
      />
    </Box>
  );
};

DeleteButton.propTypes = {
  tokenName: PropTypes.string.isRequired,
  onClickDelete: PropTypes.func.isRequired,
};

export default DeleteButton;
