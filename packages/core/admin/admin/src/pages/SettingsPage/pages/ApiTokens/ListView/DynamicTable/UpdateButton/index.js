import React from 'react';
import EditIcon from '@strapi/icons/EditIcon';
import { IconButton } from '@strapi/parts/IconButton';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';

const UpdateButton = ({ tokenName, onClickUpdate }) => {
  const { formatMessage } = useIntl();

  return (
    <IconButton
      onClick={onClickUpdate}
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

UpdateButton.defaultProps = {
  onClickUpdate: () => {},
};

UpdateButton.propTypes = {
  tokenName: PropTypes.string.isRequired,
  onClickUpdate: PropTypes.func,
};

export default UpdateButton;
