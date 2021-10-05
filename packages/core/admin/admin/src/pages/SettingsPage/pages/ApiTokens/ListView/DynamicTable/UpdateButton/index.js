import React from 'react';
import EditIcon from '@strapi/icons/EditIcon';
import { IconButton } from '@strapi/parts/IconButton';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';

const UpdateButton = ({ canUpdate, tokenName }) => {
  const { formatMessage } = useIntl();

  let component = null;

  if (canUpdate) {
    component = (
      <IconButton
        label={formatMessage(
          {
            id: 'app.component.table.edit',
            defaultMessage: 'Edit {target}',
          },
          { target: tokenName }
        )}
        noBorder
        icon={<EditIcon />}
      />
    );
  }

  return component;
};

UpdateButton.defaultProps = {
  canUpdate: false,
  tokenName: null,
};

UpdateButton.propTypes = {
  canUpdate: PropTypes.bool,
  tokenName: PropTypes.string,
};

export default UpdateButton;
