import { Button, ButtonProps } from '@strapi/design-system';
import { Mail } from '@strapi/icons';
import { useIntl } from 'react-intl';

interface CreateActionCEProps extends Pick<ButtonProps, 'onClick'> {}

const CreateActionCE = ({ onClick }: CreateActionCEProps) => {
  const { formatMessage } = useIntl();

  return (
    <Button onClick={onClick} startIcon={<Mail />} size="S">
      {formatMessage({
        id: 'Settings.permissions.users.create',
        defaultMessage: 'Invite new user',
      })}
    </Button>
  );
};

export { CreateActionCE };
export type { CreateActionCEProps };
