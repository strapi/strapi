import * as React from 'react';

import { createSelector } from '@reduxjs/toolkit';
import { useRBAC, type Permission } from '@strapi/helper-plugin';
import { useParams } from 'react-router-dom';

import { createContext } from '../../components/Context';
import { RootState } from '../../core/store/configure';
import { useTypedSelector } from '../../core/store/hooks';

interface DocumentActionsRBACContextValue {
  canCreate?: boolean;
  canDelete?: boolean;
  canPublish?: boolean;
  canRead?: boolean;
  canUpdate?: boolean;
  isLoading: boolean;
}

const [DocumentActionsRBACProvider, useDocumentActionsRBAC] =
  createContext<DocumentActionsRBACContextValue>('DocumentActionsRBAC', {
    canCreate: false,
    canDelete: false,
    canPublish: false,
    canRead: false,
    canUpdate: false,
    isLoading: false,
  });

interface DocumentActionsRBACProps {
  children: React.ReactNode;
  permissions: Permission[];
}

const selectContentTypePermissionsOrganisedByAction = createSelector(
  [
    (state: RootState) => state.rbacProvider.collectionTypesRelatedPermissions,
    (_, slug: string) => slug,
  ],
  (allContentTypePermissions, slug) => {
    const contentTypePermissions = allContentTypePermissions[slug];

    return Object.entries(contentTypePermissions).reduce((acc, [action, permissions]) => {
      /**
       * The original action is in the format `plugins::content-manager.explorer.{ACTION}`,
       * we only want the last part of the string so our actions form properties like can{ACTION}
       */
      const [actionShorthand] = action.split('.').slice(-1);

      return {
        ...acc,
        [actionShorthand]: permissions,
      };
    }, {});
  }
);

/**
 * @internal This component is not meant to be used outside of the Content Manager plugin.
 * It depends on knowing the slug/model of the contnet-type using the params of the URL.
 * If you do use the hook outside of the context, we default to `false` for all actions.
 *
 * It then creates an list of `can{Action}` that are passed to the context for consumption
 * within the app to enforce RBAC.
 */
const DocumentActionsRBAC = ({ children, permissions }: DocumentActionsRBACProps) => {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) {
    throw new Error('Cannot find the slug param in the URL');
  }

  const contentTypePermissions = useTypedSelector((state) =>
    selectContentTypePermissionsOrganisedByAction(state, slug)
  );

  const { isLoading, allowedActions } = useRBAC(contentTypePermissions, permissions ?? []);

  return (
    <DocumentActionsRBACProvider isLoading={isLoading} {...allowedActions}>
      {children}
    </DocumentActionsRBACProvider>
  );
};

export {
  DocumentActionsRBAC,
  useDocumentActionsRBAC,
  DocumentActionsRBACContextValue,
  DocumentActionsRBACProps,
};
