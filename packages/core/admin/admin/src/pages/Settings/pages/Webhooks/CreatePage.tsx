import { CheckPagePermissions } from '@strapi/helper-plugin';

import { useTypedSelector } from '../../../../core/store/hooks';
import { selectAdminPermissions } from '../../../../selectors';

import { EditPage } from './EditPage';

const ProtectedCreatePage = () => {
  const permissions = useTypedSelector(selectAdminPermissions);

  return (
    <CheckPagePermissions permissions={permissions.settings?.webhooks.create}>
      <EditPage />
    </CheckPagePermissions>
  );
};

export { ProtectedCreatePage, EditPage as CreatePage };
