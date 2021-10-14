import React from 'react';
import EditIcon from '@strapi/icons/EditIcon';
import { IconButton } from '@strapi/parts/IconButton';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';

const UpdateButton = ({ tokenName }) => {
  const { formatMessage } = useIntl();

  return (
    <IconButton
      label={formatMessage(
        {
          id: 'app.component.table.edit',
          defaultMessage: 'Edit {target}',
        },
        { target: `${tokenName}` }
      )}
      noBorder
      icon={<EditIcon />}
    />
  );
};

UpdateButton.propTypes = {
  tokenName: PropTypes.string.isRequired,
};

export default UpdateButton;
