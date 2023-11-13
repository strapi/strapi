import { CheckPagePermissions } from '@strapi/helper-plugin';
import { useSelector } from 'react-redux';

import { selectAdminPermissions } from '../../../../selectors';

import { TransferTokenListView } from './ListView';

export const ProtectedTransferTokenListView = () => {
  const permissions = useSelector(selectAdminPermissions);

  return (
    <>
      {/* @ts-expect-error this is fine */}
      <CheckPagePermissions permissions={permissions.settings['transfer-tokens'].main}>
        <TransferTokenListView />
      </CheckPagePermissions>
    </>
  );
};
