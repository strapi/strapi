import { useFetchClient, useRBAC } from '@strapi/helper-plugin';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';

import { selectAdminPermissions } from '../../../../admin/src/pages/App/selectors';

const useLicenseLimits = () => {
  const permissions = useSelector(selectAdminPermissions);
  const { get } = useFetchClient();
  const {
    isLoading: isRBACLoading,
    allowedActions: { canRead, canCreate, canUpdate, canDelete },
  } = useRBAC(permissions.settings.users);

  const isRBACAllowed = canRead && canCreate && canUpdate && canDelete;

  const license = useQuery(
    ['ee', 'license-limit-info'],
    async () => {
      const {
        data: { data },
      } = await get('/admin/license-limit-information');

      return data;
    },
    {
      enabled: !isRBACLoading && isRBACAllowed,
    }
  );

  return { license };
};

export default useLicenseLimits;
