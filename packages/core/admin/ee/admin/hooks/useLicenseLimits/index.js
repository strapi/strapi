import { useFetchClient, useRBAC } from '@strapi/helper-plugin';
import { useQuery } from 'react-query';
import adminPermissions from '../../../../admin/src/permissions';

const useLicenseLimits = () => {
  const rbac = useRBAC(adminPermissions.settings.users);

  const {
    isLoading: isRBACLoading,
    allowedActions: { canRead, canCreate, canUpdate, canDelete },
  } = rbac;

  const isRBACAllowed = canRead && canCreate && canUpdate && canDelete;

  const { get } = useFetchClient();
  const fetchLicenseLimitInfo = async () => {
    const {
      data: { data },
    } = await get('/admin/license-limit-information');

    return data;
  };

  const license = useQuery(['ee', 'license-limit-info'], fetchLicenseLimitInfo, {
    enabled: !isRBACLoading && isRBACAllowed,
  });

  return { license };
};

export default useLicenseLimits;
