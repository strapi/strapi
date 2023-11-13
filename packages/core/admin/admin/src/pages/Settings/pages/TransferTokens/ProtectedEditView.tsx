import { CheckPagePermissions } from '@strapi/helper-plugin';
import { useSelector } from 'react-redux';

import { selectAdminPermissions } from '../../../../selectors';

import { TransferTokenCreateView } from './EditView';

export const ProtectedTransferTokenCreateView = () => {
  const permissions = useSelector(selectAdminPermissions);

  return (
    <>
      {/* @ts-expect-error this is fine */}
      <CheckPagePermissions permissions={permissions.settings['transfer-tokens'].read}>
        <TransferTokenCreateView />
      </CheckPagePermissions>
    </>
  );
};
