import { Page, useRBAC } from '@strapi/admin/strapi-admin';
import { useParams } from 'react-router-dom';

import { PERMISSIONS } from '../../constants';
import { useGetPermissionLayoutQuery } from '../../services/permissions';
import { useGetRoleQuery } from '../../services/roles';

import { RoleEditor } from './EditPage';

/**
 * `/settings/end-users/roles/new`, and `.../duplicate/:documentId`, which starts from the rows of
 * the role it names. The editor is the one of the edit page, saving with a create.
 */
const CreatePage = () => {
  const { documentId } = useParams<{ documentId?: string }>();
  const {
    isLoading: isLoadingPermissions,
    allowedActions: { canCreate },
  } = useRBAC(PERMISSIONS.roles);
  const { data: layout, isLoading: isLoadingLayout } = useGetPermissionLayoutQuery();
  const { data: source, isLoading: isLoadingSource } = useGetRoleQuery(documentId ?? '', {
    skip: documentId === undefined,
  });

  if (isLoadingPermissions || isLoadingLayout || isLoadingSource) {
    return <Page.Loading />;
  }

  // A duplicate of a role that cannot be loaded is no page: it would open as a role with nothing
  if (!layout || (documentId !== undefined && !source)) {
    return <Page.Error />;
  }

  return (
    <RoleEditor
      mode={documentId === undefined ? 'create' : 'duplicate'}
      layout={layout}
      role={source}
      canSave={canCreate}
    />
  );
};

export { CreatePage };
