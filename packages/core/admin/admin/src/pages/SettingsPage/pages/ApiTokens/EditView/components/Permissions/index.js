import React, { memo } from 'react';
import { useIntl } from 'react-intl';
import { Typography, Stack, Grid, GridItem } from '@strapi/design-system';
import ContentTypesSection from '../ContenTypesSection';
import ActionBoundRoutes from '../ActionBoundRoutes';
import { useApiTokenPermissionsContext } from '../../../../../../../contexts/ApiTokenPermissions';

const Permissions = ({ ...props }) => {
  const {
    value: { data },
  } = useApiTokenPermissionsContext();
  const { formatMessage } = useIntl();

  return (
    <Grid gap={0} shadow="filterShadow" hasRadius background="neutral0">
      <GridItem col={7} paddingTop={6} paddingBottom={6} paddingLeft={7} paddingRight={7}>
        <Stack spacing={2}>
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
        </Stack>
        {data?.permissions && <ContentTypesSection section={data?.permissions} {...props} />}
      </GridItem>
      <ActionBoundRoutes />
    </Grid>
  );
};

export default memo(Permissions);
