import React from 'react';

import { Button } from '@strapi/design-system';
import { Envelop } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

export const CreateActionCE = ({ onClick }) => {
  const { formatMessage } = useIntl();

  return (
    <Button onClick={onClick} startIcon={<Envelop />} size="S">
      {formatMessage({
        id: 'Settings.permissions.users.create',
        defaultMessage: 'Invite new user',
      })}
    </Button>
  );
};

CreateActionCE.propTypes = {
  onClick: PropTypes.func.isRequired,
};
