import { CheckPagePermissions } from '@strapi/helper-plugin';
import { useSelector } from 'react-redux';

import { selectAdminPermissions } from '../../../../selectors';

import { EditView } from './EditView/EditViewPage';

export const ProtectedCreateView = () => {
  const permissions = useSelector(selectAdminPermissions);

  return (
    <CheckPagePermissions permissions={permissions.settings?.['api-tokens'].create}>
      <EditView />
    </CheckPagePermissions>
  );
};
