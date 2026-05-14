import { Flex, Loader, Typography } from '@strapi/design-system';
import { WarningCircle } from '@strapi/icons';
import { EmptyDocuments, EmptyPermissions } from '@strapi/icons/symbols';
import { useIntl } from 'react-intl';

/* -------------------------------------------------------------------------------------------------
 * Loading
 * -----------------------------------------------------------------------------------------------*/

interface LoadingProps {
  children?: string;
}

const Loading = ({ children }: LoadingProps) => {
  const { formatMessage } = useIntl();

  return (
    <Flex height="100%" justifyContent="center" alignItems="center">
      <Loader>
        {children ??
          formatMessage({
            id: 'HomePage.widget.loading',
            defaultMessage: 'Loading widget content',
          })}
      </Loader>
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Error
 * -----------------------------------------------------------------------------------------------*/

interface ErrorProps {
  children?: string;
}

const Error = ({ children }: ErrorProps) => {
  const { formatMessage } = useIntl();

  return (
    <Flex height="100%" direction="column" justifyContent="center" alignItems="center" gap={2}>
      <WarningCircle width="3.2rem" height="3.2rem" fill="danger600" />
      <Typography variant="delta">
        {formatMessage({
          id: 'global.error',
          defaultMessage: 'Something went wrong',
        })}
      </Typography>
      <Typography textColor="neutral600">
        {children ??
          formatMessage({
            id: 'HomePage.widget.error',
            defaultMessage: "Couldn't load widget content.",
          })}
      </Typography>
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * NoData
 * -----------------------------------------------------------------------------------------------*/

interface NoDataProps {
  children?: string;
}

const NoData = ({ children }: NoDataProps) => {
  const { formatMessage } = useIntl();

  return (
    <Flex height="100%" direction="column" justifyContent="center" alignItems="center" gap={6}>
      <EmptyDocuments width="16rem" height="8.8rem" />
      <Typography textColor="neutral600">
        {children ??
          formatMessage({
            id: 'HomePage.widget.no-data',
            defaultMessage: 'No content found.',
          })}
      </Typography>
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * NoPermissions
 * -----------------------------------------------------------------------------------------------*/

interface NoPermissionsProps {
  children?: string;
}

const NoPermissions = ({ children }: NoPermissionsProps) => {
  const { formatMessage } = useIntl();

  return (
    <Flex height="100%" direction="column" justifyContent="center" alignItems="center" gap={6}>
      <EmptyPermissions width="16rem" height="8.8rem" />
      <Typography textColor="neutral600">
        {children ??
          formatMessage({
            id: 'HomePage.widget.no-permissions',
            defaultMessage: 'You don’t have the permission to see this widget',
          })}
      </Typography>
    </Flex>
  );
};

const Widget = {
  Loading,
  Error,
  NoData,
  NoPermissions,
};

export { Widget };
