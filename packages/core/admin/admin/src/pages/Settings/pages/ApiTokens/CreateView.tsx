import { Page } from '../../../../components/PageHelpers';
import { useTypedSelector } from '../../../../core/store/hooks';

import { EditView } from './EditView/EditViewPage';

export const ProtectedCreateView = () => {
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.settings?.['api-tokens'].create
  );

  return (
    <Page.Protect permissions={permissions}>
      <EditView />
    </Page.Protect>
  );
};
