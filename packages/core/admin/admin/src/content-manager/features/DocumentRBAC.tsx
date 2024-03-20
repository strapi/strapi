import * as React from 'react';

import { useParams } from 'react-router-dom';

import { createContext } from '../../components/Context';
import { useAuth, type Permission } from '../../features/Auth';
import { useRBAC } from '../../hooks/useRBAC';

import type { Attribute } from '@strapi/types';

/**
 * The boolean values indicate the global actions a user can perform on the document.
 * The `string[]` values tell us specifically which fields the actions can be performed on,
 * for example, if the `canReadFields` array is empty, than no fields can be read by the user.
 * This can happen even if the user can read the document.
 */
interface DocumentRBACContextValue {
  canCreate?: boolean;
  canCreateFields: string[];
  canDelete?: boolean;
  canPublish?: boolean;
  canRead?: boolean;
  canReadFields: string[];
  canUpdate?: boolean;
  canUpdateFields: string[];
  canUserAction: (
    fieldName: string,
    fieldsUserCanAction: string[],
    fieldType: Attribute.Kind
  ) => boolean;
  isLoading: boolean;
}

const [DocumentRBACProvider, useDocumentRBAC] = createContext<DocumentRBACContextValue>(
  'DocumentRBAC',
  {
    canCreate: false,
    canCreateFields: [],
    canDelete: false,
    canPublish: false,
    canRead: false,
    canReadFields: [],
    canUpdate: false,
    canUpdateFields: [],
    canUserAction: () => false,
    isLoading: false,
  }
);

interface DocumentRBACProps {
  children: React.ReactNode;
  permissions: Permission[] | null;
}

/**
 * @internal This component is not meant to be used outside of the Content Manager plugin.
 * It depends on knowing the slug/model of the content-type using the params of the URL.
 * If you do use the hook outside of the context, we default to `false` for all actions.
 *
 * It then creates an list of `can{Action}` that are passed to the context for consumption
 * within the app to enforce RBAC.
 */
const DocumentRBAC = ({ children, permissions }: DocumentRBACProps) => {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) {
    throw new Error('Cannot find the slug param in the URL');
  }

  const userPermissions = useAuth('DocumentRBAC', (state) => state.permissions);

  const contentTypePermissions = React.useMemo(() => {
    const contentTypePermissions = userPermissions.filter(
      (permission) => permission.subject === slug
    );
    return contentTypePermissions.reduce<Record<string, Permission[]>>((acc, permission) => {
      const [action] = permission.action.split('.').slice(-1);
      return { ...acc, [action]: [permission] };
    }, {});
  }, [slug, userPermissions]);

  const { isLoading, allowedActions } = useRBAC(contentTypePermissions, permissions ?? undefined);

  const canCreateFields =
    !isLoading && allowedActions.canCreate
      ? extractAndDedupeFields(contentTypePermissions.create)
      : [];

  const canReadFields =
    !isLoading && allowedActions.canRead ? extractAndDedupeFields(contentTypePermissions.read) : [];

  const canUpdateFields =
    !isLoading && allowedActions.canUpdate
      ? extractAndDedupeFields(contentTypePermissions.update)
      : [];

  /**
   * @description Checks if the user can perform an action on a field based on the field names
   * provided as the second argument.
   */
  const canUserAction: DocumentRBACContextValue['canUserAction'] = React.useCallback(
    (fieldName, fieldsUserCanAction, fieldType) => {
      const name = removeNumericalStrings(fieldName.split('.'));

      const componentFieldNames = fieldsUserCanAction
        // filter out fields that aren't components (components are dot separated)
        .filter((field) => field.split('.').length > 1);

      if (fieldType === 'component') {
        const componentOrDynamicZoneFields = componentFieldNames
          // then map to give us the dot separate path as an array
          .map((field) => field.split('.'));
        // check if the field name is within any of those arrays
        return componentOrDynamicZoneFields.some((field) => {
          return field.includes(fieldName);
        });
      }

      /**
       * The field is within a component.
       */
      if (name.length > 1) {
        return componentFieldNames.includes(name.join('.'));
      }

      /**
       * just a regular field
       */
      return fieldsUserCanAction.includes(fieldName);
    },
    []
  );

  return (
    <DocumentRBACProvider
      isLoading={isLoading}
      canCreateFields={canCreateFields}
      canReadFields={canReadFields}
      canUpdateFields={canUpdateFields}
      canUserAction={canUserAction}
      {...allowedActions}
    >
      {children}
    </DocumentRBACProvider>
  );
};

/**
 * @internal it's really small, but it's used three times in a row and DRY for something this straight forward.
 */
const extractAndDedupeFields = (permissions: Permission[] = []) =>
  permissions
    .flatMap((permission) => permission.properties?.fields)
    .filter(
      (field, index, arr): field is string =>
        arr.indexOf(field) === index && typeof field === 'string'
    );

/**
 * @internal removes numerical strings from arrays.
 * @example
 * ```ts
 * const name = 'a.0.b';
 * const res = removeNumericalStrings(name.split('.'));
 * console.log(res); // ['a', 'b']
 * ```
 */
const removeNumericalStrings = (arr: string[]) => arr.filter((item) => isNaN(Number(item)));

export { DocumentRBAC, useDocumentRBAC, DocumentRBACContextValue, DocumentRBACProps };
