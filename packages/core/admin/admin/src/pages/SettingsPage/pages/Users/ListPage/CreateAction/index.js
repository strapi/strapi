import React from 'react';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { Button } from '@strapi/design-system';
import { Envelop } from '@strapi/icons';

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
