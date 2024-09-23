import * as React from 'react';

import { Button, ButtonProps } from '@strapi/design-system';
import { Mail } from '@strapi/icons';
import { useIntl } from 'react-intl';

interface CreateActionCEProps extends Pick<ButtonProps, 'onClick'> {}

const CreateActionCE = React.forwardRef<HTMLButtonElement, CreateActionCEProps>((props, ref) => {
  const { formatMessage } = useIntl();

  return (
    <Button ref={ref} startIcon={<Mail />} size="S" {...props}>
      {formatMessage({
        id: 'Settings.permissions.users.create',
        defaultMessage: 'Invite new user',
      })}
    </Button>
  );
});

export { CreateActionCE };
export type { CreateActionCEProps };
