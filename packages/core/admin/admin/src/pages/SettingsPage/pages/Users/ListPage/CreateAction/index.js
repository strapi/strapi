import React from 'react';

import { Button } from '@strapi/design-system';
import { Envelop } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

const CreateAction = ({ onClick }) => {
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

CreateAction.propTypes = {
  onClick: PropTypes.func.isRequired,
};

export default CreateAction;
