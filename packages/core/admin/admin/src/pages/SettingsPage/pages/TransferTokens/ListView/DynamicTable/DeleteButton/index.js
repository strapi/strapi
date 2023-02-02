import React from 'react';
import Trash from '@strapi/icons/Trash';
import { IconButton } from '@strapi/design-system/IconButton';
import { Box } from '@strapi/design-system/Box';
import { stopPropagation, useTracking } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';

const DeleteButton = ({ tokenName, onClickDelete }) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();

  return (
    <Box paddingLeft={1} {...stopPropagation}>
      <IconButton
        onClick={() => {
          trackUsage('willDeleteToken');
          onClickDelete();
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
    </Box>
  );
};

DeleteButton.propTypes = {
  tokenName: PropTypes.string.isRequired,
  onClickDelete: PropTypes.func.isRequired,
};

export default DeleteButton;
