import { CheckPagePermissions } from '@strapi/helper-plugin';
import { useSelector } from 'react-redux';

import { selectAdminPermissions } from '../../../../selectors';

import { EditView } from './EditView';

export const ProtectedCreateView = () => {
  const permissions = useSelector(selectAdminPermissions);

  return (
    <CheckPagePermissions permissions={permissions.settings?.['transfer-tokens'].create}>
      <EditView />
    </CheckPagePermissions>
  );
};
