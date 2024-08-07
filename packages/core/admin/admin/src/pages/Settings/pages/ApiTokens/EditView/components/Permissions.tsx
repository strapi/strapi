import { Flex, Grid, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useApiTokenPermissions } from '../apiTokenPermissions';

import { ActionBoundRoutes } from './ActionBoundRoutes';
import { ContentTypesSection } from './ContentTypesSection';

export const Permissions = ({ ...props }) => {
  const {
    value: { data },
  } = useApiTokenPermissions();
  const { formatMessage } = useIntl();

  return (
    <Grid.Root gap={0} shadow="filterShadow" hasRadius background="neutral0">
      <Grid.Item
        col={7}
        paddingTop={6}
        paddingBottom={6}
        paddingLeft={7}
        paddingRight={7}
        direction="column"
        alignItems="stretch"
      >
        <Flex direction="column" alignItems="stretch" gap={2}>
          <Typography variant="delta" tag="h2">
            {formatMessage({
              id: 'Settings.apiTokens.createPage.permissions.title',
              defaultMessage: 'Permissions',
            })}
          </Typography>
          <Typography tag="p" textColor="neutral600">
            {formatMessage({
              id: 'Settings.apiTokens.createPage.permissions.description',
              defaultMessage: 'Only actions bound by a route are listed below.',
            })}
          </Typography>
        </Flex>
        {data?.permissions && <ContentTypesSection section={data?.permissions} {...props} />}
      </Grid.Item>
      <ActionBoundRoutes />
    </Grid.Root>
  );
};
