import React, { memo } from 'react';

import { Flex, Grid, GridItem, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useApiTokenPermissionsContext } from '../../../../../../../contexts/apiTokenPermissions';
import ActionBoundRoutes from '../ActionBoundRoutes';
import ContentTypesSection from '../ContenTypesSection';

const Permissions = ({ ...props }) => {
  const {
    value: { data },
  } = useApiTokenPermissionsContext();
  const { formatMessage } = useIntl();

  return (
    <Grid gap={0} shadow="filterShadow" hasRadius background="neutral0">
      <GridItem col={7} paddingTop={6} paddingBottom={6} paddingLeft={7} paddingRight={7}>
        <Flex direction="column" alignItems="stretch" gap={2}>
          <Typography variant="delta" as="h2">
            {formatMessage({
              id: 'Settings.apiTokens.createPage.permissions.title',
              defaultMessage: 'Permissions',
            })}
          </Typography>
          <Typography as="p" textColor="neutral600">
            {formatMessage({
              id: 'Settings.apiTokens.createPage.permissions.description',
              defaultMessage: 'Only actions bound by a route are listed below.',
            })}
          </Typography>
        </Flex>
        {data?.permissions && <ContentTypesSection section={data?.permissions} {...props} />}
      </GridItem>
      <ActionBoundRoutes />
    </Grid>
  );
};

export default memo(Permissions);
