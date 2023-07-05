import * as React from 'react';

import { useFetchClient, useRBAC } from '@strapi/helper-plugin';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';

import { selectAdminPermissions } from '../../../../admin/src/pages/App/selectors';

export function useLicenseLimits() {
  const permissions = useSelector(selectAdminPermissions);
  const { get } = useFetchClient();
  const {
    isLoading: isRBACLoading,
    allowedActions: { canRead, canCreate, canUpdate, canDelete },
  } = useRBAC(permissions.settings.users);
  const hasPermissions = canRead && canCreate && canUpdate && canDelete;

  const { data, isError, isLoading } = useQuery(
    ['ee', 'license-limit-info'],
    async () => {
      const {
        data: { data },
      } = await get('/admin/license-limit-information');

      return data;
    },
    {
      enabled: !isRBACLoading && hasPermissions,
    }
  );

  const license = data ?? {};

  const getFeature = React.useCallback(
    (name) => {
      const feature = (license?.features ?? []).find((feature) => feature.name === name);

      return feature?.options ?? {};
    },
    [license?.features]
  );

  return { license, getFeature, isError, isLoading };
}
