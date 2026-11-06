import * as React from 'react';

import {
  useRBAC,
  useAuth,
  type Permission,
  createContext,
  useQueryParams,
} from '@strapi/admin/strapi-admin';
import { useParams } from 'react-router-dom';

import type { Schema } from '@strapi/types';

/**
 * The boolean values indicate the global actions a user can perform on the document.
 * The `string[]` values contain field restrictions. The `can*AllFields` values distinguish
 * an unrestricted field grant from an explicit empty list that grants no fields.
 */
interface DocumentRBACContextValue {
  canCreate?: boolean;
  canCreateAllFields: boolean;
  canCreateFields: string[];
  canDelete?: boolean;
  canPublish?: boolean;
  canRead?: boolean;
  canReadAllFields: boolean;
  canReadFields: string[];
  canUpdate?: boolean;
  canUpdateAllFields: boolean;
  canUpdateFields: string[];
  canUserAction: (
    fieldName: string,
    fieldsUserCanAction: string[],
    fieldType: Schema.Attribute.Kind,
    canPerformAction: boolean,
    canPerformActionOnAllFields: boolean
  ) => boolean;
  isLoading: boolean;
}

const [DocumentRBACProvider, useDocumentRBAC] = createContext<DocumentRBACContextValue>(
  'DocumentRBAC',
  {
    canCreate: false,
    canCreateAllFields: false,
    canCreateFields: [],
    canDelete: false,
    canPublish: false,
    canRead: false,
    canReadAllFields: false,
    canReadFields: [],
    canUpdate: false,
    canUpdateAllFields: false,
    canUpdateFields: [],
    canUserAction: () => false,
    isLoading: false,
  }
);

interface DocumentRBACProps {
  children: React.ReactNode;
  permissions: Permission[] | null;
  model?: string;
}

/**
 * @internal This component is not meant to be used outside of the Content Manager plugin.
 * It depends on knowing the slug/model of the content-type using the params of the URL or the model if it is passed as arg.
 * If you do use the hook outside of the context, we default to `false` for all actions.
 *
 * It then creates an list of `can{Action}` that are passed to the context for consumption
 * within the app to enforce RBAC.
 */
const DocumentRBAC = ({ children, permissions, model }: DocumentRBACProps) => {
  const { slug } = useParams<{ slug: string }>();

  if (!slug && !model) {
    throw new Error('Cannot find the slug param in the URL or the model prop is not provided.');
  }

  const contentTypeUid = model ?? slug;

  const [{ rawQuery }] = useQueryParams<{ plugins?: { i18n?: { locale?: string } } }>();

  const userPermissions = useAuth('DocumentRBAC', (state) => state.permissions);

  const contentTypePermissions = React.useMemo(() => {
    const contentTypePermissions = userPermissions.filter(
      (permission) => permission.subject === contentTypeUid
    );
    return contentTypePermissions.reduce<Record<string, Permission[]>>((acc, permission) => {
      const [action] = permission.action.split('.').slice(-1);
      return { ...acc, [action]: [...(acc[action] ?? []), permission] };
    }, {});
  }, [contentTypeUid, userPermissions]);

  const { isLoading, allowedActions } = useRBAC(
    contentTypePermissions,
    permissions ?? undefined,
    // TODO: useRBAC context should be typed and built differently
    // We are passing raw query as context to the hook so that it can
    // rely on the locale provided from DocumentRBAC for its permission calculations.
    rawQuery
  );

  const canCreateFields =
    !isLoading && allowedActions.canCreate
      ? extractAndDedupeFields(contentTypePermissions.create)
      : [];

  const canCreateAllFields =
    !isLoading &&
    allowedActions.canCreate === true &&
    hasUnrestrictedFieldAccess(contentTypePermissions.create);

  const canReadFields =
    !isLoading && allowedActions.canRead ? extractAndDedupeFields(contentTypePermissions.read) : [];

  const canReadAllFields =
    !isLoading &&
    allowedActions.canRead === true &&
    hasUnrestrictedFieldAccess(contentTypePermissions.read);

  const canUpdateFields =
    !isLoading && allowedActions.canUpdate
      ? extractAndDedupeFields(contentTypePermissions.update)
      : [];

  const canUpdateAllFields =
    !isLoading &&
    allowedActions.canUpdate === true &&
    hasUnrestrictedFieldAccess(contentTypePermissions.update);

  /**
   * @description Checks global action permission, unrestricted access, and any field restrictions.
   */
  const canUserAction: DocumentRBACContextValue['canUserAction'] = React.useCallback(
    (
      fieldName,
      fieldsUserCanAction,
      fieldType,
      canPerformAction,
      canPerformActionOnAllFields
    ) => {
      if (!canPerformAction) {
        return false;
      }

      if (canPerformActionOnAllFields) {
        return true;
      }

      if (fieldsUserCanAction.length === 0) {
        return false;
      }

      const name = removeNumericalStrings(fieldName.split('.'));

      const componentFieldNames = fieldsUserCanAction
        // filter out fields that aren't components (components are dot separated)
        .filter((field) => field.split('.').length > 1);

      if (fieldType === 'component') {
        // check if the field name is within any of those arrays
        return componentFieldNames.some((field) => {
          return field.includes(name.join('.'));
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
      canCreateAllFields={canCreateAllFields}
      canReadFields={canReadFields}
      canReadAllFields={canReadAllFields}
      canUpdateFields={canUpdateFields}
      canUpdateAllFields={canUpdateAllFields}
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
const extractAndDedupeFields = (permissions: Permission[] = []) => {
  if (hasUnrestrictedFieldAccess(permissions)) return [];
  const allFields = permissions.flatMap((permission) => permission.properties?.fields ?? []);
  return Array.from(new Set(allFields as string[]));
};

const hasUnrestrictedFieldAccess = (permissions: Permission[] = []) =>
  permissions.some(
    (permission) =>
      permission.properties?.fields === undefined || permission.properties.fields === null
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
