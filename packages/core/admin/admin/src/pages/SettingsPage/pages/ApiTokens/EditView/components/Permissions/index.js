import React, { memo } from 'react';
import { Box } from '@strapi/design-system/Box';
import ContentTypesSection from '../ContenTypesSection';
import { useApiTokenPermissionsContext } from '../../../../../../../contexts/ApiTokenPermissions';

const Permissions = ({ ...props }) => {
  const {
    value: { data },
  } = useApiTokenPermissionsContext();

  return (
    <Box shadow="filterShadow">
      {data.permissions && <ContentTypesSection section={data.permissions} {...props} />}
    </Box>
  );
};

export default memo(Permissions);
