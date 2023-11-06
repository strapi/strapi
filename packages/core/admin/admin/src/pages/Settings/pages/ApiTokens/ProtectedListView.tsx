import { CheckPagePermissions } from '@strapi/helper-plugin';
import { useSelector } from 'react-redux';

import { selectAdminPermissions } from '../../../../selectors';

import { ListView } from './ListView';

export const ProtectedApiTokenListView = () => {
  const permissions = useSelector(selectAdminPermissions);

  return (
    <>
      {/* @ts-expect-error we know permissions.settings is defined */}
      <CheckPagePermissions permissions={permissions.settings['api-tokens'].main}>
        <ListView />
      </CheckPagePermissions>
    </>
  );
};
