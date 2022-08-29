import React, { memo } from 'react';
import { useIntl } from 'react-intl';
import { Box } from '@strapi/design-system/Box';
import { Typography } from '@strapi/design-system/Typography';
import { Stack } from '@strapi/design-system/Stack';
import ContentTypesSection from '../ContenTypesSection';
import { useApiTokenPermissionsContext } from '../../../../../../../contexts/ApiTokenPermissions';

const Permissions = ({ ...props }) => {
  const {
    value: { data },
  } = useApiTokenPermissionsContext();
  const { formatMessage } = useIntl();

  return (
    <Box shadow="filterShadow" padding={4} background="neutral0">
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
      {data.permissions && <ContentTypesSection section={data.permissions} {...props} />}
    </Box>
  );
};

export default memo(Permissions);
