import { Button, Flex, Tooltip } from '@strapi/design-system';
import { Mail, WarningCircle } from '@strapi/icons';
import isNil from 'lodash/isNil';
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
          label={formatMessage({
            id: 'Settings.application.admin-seats.at-limit-tooltip',
            defaultMessage: 'At limit: add seats to invite more users',
          })}
          side="left"
        >
          <WarningCircle width="1.4rem" height="1.4rem" fill="danger500" />
        </Tooltip>
      )}
      <Button
        data-testid="create-user-button"
        onClick={onClick}
        startIcon={<Mail />}
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
