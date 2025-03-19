import { lazy } from 'react';

import { Page } from '../../../../components/PageHelpers';
import { useTypedSelector } from '../../../../core/store/hooks';

// import { EditPage } from './EditPage';

const EditPage = lazy(() => import('./EditPage').then((module) => ({ default: module.EditPage })));

const ProtectedCreatePage = () => {
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.settings?.webhooks.create
  );

  return (
    <Page.Protect permissions={permissions}>
      <EditPage />
    </Page.Protect>
  );
};

export { ProtectedCreatePage };
