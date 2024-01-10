import { isObject } from '../../../../../utils/objects';

import { createArrayOfValues } from './createArrayOfValues';

import type { ConditionForm, Form, PropertyChildForm } from './forms';
import type { UpdatePermissions } from '../../../../../../../shared/contracts/roles';
import type { Permission } from '../../../../../../../shared/contracts/shared';
import type { PermissionsDataManagerContextValue } from '../hooks/usePermissionsDataManager';

type PermissionApiBody = UpdatePermissions.Request['body']['permissions'];

/**
 * @description Given a users permissions array we find the first one that matches a provided subject & action
 */
const findMatchingPermission = (
  permissions: Permission[],
  action: string,
  subject: string | null
) => permissions.find((perm) => perm.action === action && perm.subject === subject);

const formatPermissionsForAPI = (
  modifiedData: PermissionsDataManagerContextValue['modifiedData']
): PermissionApiBody => {
  const pluginsPermissions = formatSettingsPermissions(modifiedData.plugins);
  const settingsPermissions = formatSettingsPermissions(modifiedData.settings);
  const collectionTypesPermissions = formatContentTypesPermissions(modifiedData.collectionTypes);
  const singleTypesPermissions = formatContentTypesPermissions(modifiedData.singleTypes);

  return [
    ...pluginsPermissions,
    ...settingsPermissions,
    ...collectionTypesPermissions,
    ...singleTypesPermissions,
  ];
};

const formatSettingsPermissions = (
  settingsPermissionsObject:
    | PermissionsDataManagerContextValue['modifiedData']['plugins']
    | PermissionsDataManagerContextValue['modifiedData']['settings']
): PermissionApiBody => {
  return Object.values(settingsPermissionsObject).reduce<PermissionApiBody>((formAcc, form) => {
    const currentCategoryPermissions = Object.values(form).reduce<PermissionApiBody>(
      (childFormAcc, childForm) => {
        const permissions = Object.entries(childForm).reduce<PermissionApiBody>(
          (
            responsesAcc,
            [
              actionName,
              {
                conditions,
                properties: { enabled },
              },
            ]
          ) => {
            if (!enabled) {
              return responsesAcc;
            }

            responsesAcc.push({
              action: actionName,
              subject: null,
              conditions: createConditionsArray(conditions),
              properties: {},
            });

            return responsesAcc;
          },
          []
        );

        return [...childFormAcc, ...permissions];
      },
      []
    );

    return [...formAcc, ...currentCategoryPermissions];
  }, []);
};

const formatContentTypesPermissions = (contentTypesPermissions: Form): PermissionApiBody => {
  const permissions = Object.entries(contentTypesPermissions).reduce<PermissionApiBody>(
    (allPermissions, current) => {
      const [subject, currentSubjectActions] = current;

      const permissions = Object.entries(currentSubjectActions).reduce<PermissionApiBody>(
        (acc, current) => {
          const [actionName, permissions] = current;
          const shouldCreatePermission = createArrayOfValues(permissions).some((val) => val);

          if (!shouldCreatePermission) {
            return acc;
          }

          if (!permissions?.properties?.enabled) {
            const createdPermissionsArray = Object.entries(permissions.properties).reduce<
              PermissionApiBody[number]
            >(
              (acc, current) => {
                const [propertyName, propertyValue] = current;

                // @ts-expect-error – `propertyValue` can be boolean or an object, but we don't account for it...
                acc.properties[propertyName] = createPropertyArray(propertyValue);

                return acc;
              },
              {
                action: actionName,
                subject,
                conditions: createConditionsArray(permissions.conditions),
                properties: {},
              }
            );

            return [...acc, createdPermissionsArray];
          }

          if (!permissions.properties.enabled) {
            return acc;
          }

          acc.push({
            action: actionName,
            subject,
            properties: {},
            conditions: createConditionsArray(permissions.conditions),
          });

          return acc;
        },
        []
      );

      return [...allPermissions, ...permissions];
    },
    []
  );

  return permissions;
};

const createPropertyArray = (propertyValue: PropertyChildForm, prefix = ''): string[] => {
  return Object.entries(propertyValue).reduce<string[]>((acc, current) => {
    const [name, value] = current;

    if (isObject(value)) {
      return [...acc, ...createPropertyArray(value, `${prefix}${name}.`)];
    }

    if (value && !isObject(value)) {
      acc.push(`${prefix}${name}`);
    }

    return acc;
  }, []);
};

const createConditionsArray = (conditions: ConditionForm) =>
  Object.entries(conditions)
    .filter(([, conditionValue]) => {
      return conditionValue;
    })
    .map(([conditionName]) => conditionName);

export { findMatchingPermission, formatPermissionsForAPI };
