import { EmptyStateLayout, EmptyStateLayoutProps } from '@strapi/design-system';
import { EmptyPermissions } from '@strapi/icons';
import { useIntl } from 'react-intl';

export type NoPermissionsProps = Pick<EmptyStateLayoutProps, 'action'>;

const NoPermissions = ({ action }: NoPermissionsProps) => {
  const { formatMessage } = useIntl();

  return (
    <EmptyStateLayout
      icon={<EmptyPermissions width="10rem" />}
      content={formatMessage({
        id: 'app.components.EmptyStateLayout.content-permissions',
        defaultMessage: "You don't have the permissions to access that content",
      })}
      action={action}
    />
  );
};

export { NoPermissions };
