import * as React from 'react';

import {
  Box,
  EmptyStateLayout,
  type EmptyStateLayoutProps,
  Flex,
  Loader,
  Main,
  MainProps,
} from '@strapi/design-system';
import { WarningCircle } from '@strapi/icons';
import { EmptyPermissions, EmptyDocuments } from '@strapi/icons/symbols';
import { useIntl } from 'react-intl';

import { useAuth, Permission } from '../features/Auth';
import { useNotification } from '../features/Notifications';
import { useAPIErrorHandler } from '../hooks/useAPIErrorHandler';
import { useCheckPermissionsQuery } from '../services/auth';

/* -------------------------------------------------------------------------------------------------
 * Main
 * -----------------------------------------------------------------------------------------------*/
interface PageMainProps extends MainProps {
  children: React.ReactNode;
}

const PageMain = ({ children, ...restProps }: PageMainProps) => {
  return <Main {...restProps}>{children}</Main>;
};

/* -------------------------------------------------------------------------------------------------
 * Loading
 * -----------------------------------------------------------------------------------------------*/
interface LoadingProps {
  /**
   * @default 'Loading content.'
   */
  children?: React.ReactNode;
}

/**
 * @public
 * @description A loading component that should be rendered as the page
 * whilst you load the content for the aforementioned page.
 */
const Loading = ({ children = 'Loading content.' }: LoadingProps) => {
  return (
    <PageMain height="100vh" aria-busy={true}>
      <Flex alignItems="center" height="100%" justifyContent="center">
        <Loader>{children}</Loader>
      </Flex>
    </PageMain>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Error
 * -----------------------------------------------------------------------------------------------*/
interface ErrorProps extends Partial<EmptyStateLayoutProps> {}

/**
 * TODO: should we start passing our errors here so they're persisted on the screen?
 * This could follow something similar to how the global app error works...?
 */

/**
 * @public
 * @description An error component that should be rendered as the page
 * when an error occurs.
 */
const Error = (props: ErrorProps) => {
  const { formatMessage } = useIntl();

  return (
    <PageMain height="100%">
      <Flex alignItems="center" height="100%" justifyContent="center">
        <EmptyStateLayout
          icon={<WarningCircle width="16rem" />}
          content={formatMessage({
            id: 'anErrorOccurred',
            defaultMessage: 'Woops! Something went wrong. Please, try again.',
          })}
          {...props}
        />
      </Flex>
    </PageMain>
  );
};

/* -------------------------------------------------------------------------------------------------
 * NoPermissions
 * -----------------------------------------------------------------------------------------------*/
interface NoPermissionsProps extends Partial<EmptyStateLayoutProps> {}

/**
 * @public
 * @description A component that should be rendered as the page
 * when the user does not have the permissions to access the content.
 * This component does not check any permissions, it's up to you to decide
 * when it should be rendered.
 */
const NoPermissions = (props: NoPermissionsProps) => {
  const { formatMessage } = useIntl();

  return (
    <PageMain height="100%">
      <Flex alignItems="center" height="100%" justifyContent="center">
        <Box minWidth="50%">
          <EmptyStateLayout
            icon={<EmptyPermissions width="16rem" />}
            content={formatMessage({
              id: 'app.components.EmptyStateLayout.content-permissions',
              defaultMessage: "You don't have the permissions to access that content",
            })}
            {...props}
          />
        </Box>
      </Flex>
    </PageMain>
  );
};

/* -------------------------------------------------------------------------------------------------
 * NoData
 * -----------------------------------------------------------------------------------------------*/
interface NoDataProps extends Partial<EmptyStateLayoutProps> {}

/**
 * @public
 * @description A component that should be rendered as the page
 * when there is no data available to display.
 * This component does not check any permissions, it's up to you to decide
 * when it should be rendered.
 */
const NoData = (props: NoDataProps) => {
  const { formatMessage } = useIntl();

  return (
    <PageMain height="100%" background="neutral100">
      <Flex alignItems="center" height="100%" width="100%" justifyContent="center">
        <Box minWidth="50%">
          <EmptyStateLayout
            icon={<EmptyDocuments width="16rem" />}
            action={props.action}
            content={formatMessage({
              id: 'app.components.EmptyStateLayout.content-document',
              defaultMessage: 'No content found',
            })}
            {...props}
          />
        </Box>
      </Flex>
    </PageMain>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Protect
 * -----------------------------------------------------------------------------------------------*/
export interface ProtectProps {
  /**
   * The children to render if the user has the required permissions.
   * If providing a function, it will be called with an object containing
   * the permissions the user has based on the array you passed to the component.
   */
  children: React.ReactNode | ((args: { permissions: Permission[] }) => React.ReactNode);
  /**
   * The permissions the user needs to have to access the content.
   */
  permissions?: Array<Omit<Partial<Permission>, 'action'> & Pick<Permission, 'action'>>;
}

/**
 * @public
 * @description A wrapper component that should be used to protect a page. It will check the permissions
 * you pass to it and render the children if the user has the required permissions. If a user does not have ALL
 * the required permissions, it will redirect the user to the home page. Whilst these checks happen it will render
 * the loading component and should the check fail it will render the error component with a notification.
 */
const Protect = ({ permissions = [], children }: ProtectProps) => {
  const userPermissions = useAuth('Protect', (state) => state.permissions);
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  const matchingPermissions = userPermissions.filter(
    (permission) =>
      permissions.findIndex(
        (perm) => perm.action === permission.action && perm.subject === permission.subject
      ) >= 0
  );

  const shouldCheckConditions = matchingPermissions.some(
    (perm) => Array.isArray(perm.conditions) && perm.conditions.length > 0
  );

  const { isLoading, error, data } = useCheckPermissionsQuery(
    {
      permissions: matchingPermissions.map((perm) => ({
        action: perm.action,
        subject: perm.subject,
      })),
    },
    {
      skip: !shouldCheckConditions,
    }
  );

  React.useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error),
      });
    }
  }, [error, formatAPIError, toggleNotification]);

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return <Error />;
  }

  const { data: permissionsData } = data || {};

  const canAccess =
    shouldCheckConditions && permissionsData
      ? !permissionsData.includes(false)
      : matchingPermissions.length > 0;

  if (!canAccess) {
    return <NoPermissions />;
  }

  return (
    <>
      {typeof children === 'function' ? children({ permissions: matchingPermissions }) : children}
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Title
 * -----------------------------------------------------------------------------------------------*/
export interface TitleProps {
  children: string;
}

/**
 * @public
 * @description This component takes the children (must be a string) and sets
 * it as the title of the html.
 */
const Title = ({ children: title }: TitleProps) => {
  React.useEffect(() => {
    document.title = `${title} | Strapi`;
  }, [title]);

  return null;
};

const Page = {
  Error,
  Loading,
  NoPermissions,
  Protect,
  NoData,
  Main: PageMain,
  Title,
};

export { Page };
export type { ErrorProps, LoadingProps, NoPermissionsProps, PageMainProps as MainProps };
