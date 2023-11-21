import { Button, Flex, Icon, Tooltip } from '@strapi/design-system';
import { Envelop, ExclamationMarkCircle } from '@strapi/icons';
import isNil from 'lodash/isNil';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { useLicenseLimits } from '../../../../../hooks/useLicenseLimits';

import type { CreateActionCEProps } from '../../../../../../../../admin/src/pages/Settings/pages/Users/components/CreateActionCE';

export const CreateActionEE = ({ onClick }: CreateActionCEProps) => {
  const { formatMessage } = useIntl();
  const { license, isError, isLoading } = useLicenseLimits();

  const { permittedSeats, shouldStopCreate } = license ?? {};

  if (isError || isLoading) {
    return null;
  }

  return (
    <Flex gap={2}>
      {!isNil(permittedSeats) && shouldStopCreate && (
        <Tooltip
          description={formatMessage({
            id: 'Settings.application.admin-seats.at-limit-tooltip',
            defaultMessage: 'At limit: add seats to invite more users',
          })}
          position="left"
        >
          <Icon
            width={`${14 / 16}rem`}
            height={`${14 / 16}rem`}
            color="danger500"
            as={ExclamationMarkCircle}
          />
        </Tooltip>
      )}
      <Button
        data-testid="create-user-button"
        onClick={onClick}
        startIcon={<Envelop />}
        size="S"
        disabled={shouldStopCreate}
      >
        {formatMessage({
          id: 'Settings.permissions.users.create',
          defaultMessage: 'Invite new user',
        })}
      </Button>
    </Flex>
  );
};

CreateActionEE.propTypes = {
  onClick: PropTypes.func.isRequired,
};
