import React from 'react';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { Button } from '@strapi/design-system/Button';
import Envelop from '@strapi/icons/Envelop';
import { useLicenseLimitInfos } from '../../../../../../hooks';

const CreateAction = ({ onClick }) => {
  const { formatMessage } = useIntl();
  const licenseLimitInfos = useLicenseLimitInfos();
  const { licenseLimitStatus } = licenseLimitInfos;

  return (
    <Button
      data-testid="create-user-button"
      onClick={onClick}
      startIcon={<Envelop />}
      size="S"
      disabled={!!licenseLimitStatus}
    >
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
