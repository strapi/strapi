import _ from 'lodash';

import { contentTypes as contentTypesUtils } from '@strapi/utils';
import type { Core, Modules, Schema, Struct, UID } from '@strapi/types';
import { getService } from '../utils';
import actionDomain from '../domain/action';
import type { Action } from '../domain/action';
import permissionDomain from '../domain/permission';

interface FieldOptions {
  prefix?: string; // prefix to add to the path
  nestingLevel?: number; // level of nesting to achieve
  requiredOnly?: boolean; // only returns required nestedFields
  existingFields?: string[]; // fields that are already selected, meaning that some sub-fields may be required
  restrictedSubjects?: string[]; // subjectsId to ignore
  // With strict types, every caller passes `strapi.components` (or the recursion its own map).
  components?: Core.IsStrict extends true
    ? Schema.Components
    : {
        // components where components attributes can be found
        [key: string]: any;
      };
}

/**
 * Creates an array of paths to the fields and nested fields, without path nodes
 */
const getNestedFields = (
  // With strict types, the recursion passes the component schemas of component attributes.
  model: Core.IsStrict extends true
    ? Struct.ContentTypeSchema | Struct.ComponentSchema
    : Struct.ContentTypeSchema,
  {
    prefix = '',
    nestingLevel = 15,
    components = {},
    requiredOnly = false,
    existingFields = [],
  }: FieldOptions
): string[] => {
  if (nestingLevel === 0) {
    return prefix ? [prefix] : [];
  }

  const nonAuthorizableFields = contentTypesUtils.getNonVisibleAttributes(model);

  return _.reduce(
    model.attributes,
    (fields: any, attr: any, key: any) => {
      if (nonAuthorizableFields.includes(key)) return fields;

      const fieldPath = prefix ? `${prefix}.${key}` : key;
      const shouldBeIncluded = !requiredOnly || attr.required === true;
      const insideExistingFields =
        existingFields && existingFields.some((field) => field.startsWith(fieldPath));

      if (attr.type === 'component') {
        if (shouldBeIncluded || insideExistingFields) {
          const compoFields = getNestedFields(components[attr.component], {
            nestingLevel: nestingLevel - 1,
            prefix: fieldPath,
            components,
            requiredOnly,
            existingFields,
          });

          if (compoFields.length === 0 && shouldBeIncluded) {
            return fields.concat(fieldPath);
          }

          return fields.concat(compoFields);
        }
        return fields;
      }

      if (shouldBeIncluded) {
        return fields.concat(fieldPath);
      }

      return fields;
    },
    []
  );
};

/**
 * Creates an array of paths to the fields and nested fields, with path nodes
 */
const getNestedFieldsWithIntermediate = (
  // With strict types, the recursion passes the component schemas of component attributes.
  model: Core.IsStrict extends true
    ? Struct.ContentTypeSchema | Struct.ComponentSchema
    : Struct.ContentTypeSchema,
  { prefix = '', nestingLevel = 15, components = {} }: FieldOptions
): string[] => {
  if (nestingLevel === 0) {
    return [];
  }

  const nonAuthorizableFields = contentTypesUtils.getNonVisibleAttributes(model);

  return _.reduce(
    model.attributes,
    (fields: any, attr: any, key: any) => {
      if (nonAuthorizableFields.includes(key)) return fields;

      const fieldPath = prefix ? `${prefix}.${key}` : key;
      fields.push(fieldPath);

      if (attr.type === 'component') {
        const compoFields = getNestedFieldsWithIntermediate(components[attr.component], {
          nestingLevel: nestingLevel - 1,
          prefix: fieldPath,
          components,
        });

        fields.push(...compoFields);
      }

      return fields;
    },
    []
  );
};

/**
 * Whether the subject is the UID of a loaded content type. Own keys only, so an inherited key
 * such as `constructor` does not pass.
 */
const isContentTypeUID = (subject: string): subject is UID.ContentType => {
  return Object.hasOwn(strapi.contentTypes, subject);
};

/**
 * What {@link getPermissionsWithNestedFields} reads from an action. With strict types, both a stored
 * action (`actionProvider.values()` and `get`) and an {@link Action} are accepted.
 */
type NestedFieldsAction = {
  actionId: string;
  subjects?: readonly (string | undefined)[] | undefined;
  options: { applyToProperties: readonly (string | undefined)[] | null };
};

/**
 * Creates an array of permissions with the "properties.fields" attribute filled.
 * An action without subjects and an undefined subject create no permission. When the action
 * applies to fields, a subject that is not a loaded content type creates no permission either,
 * since its fields cannot be resolved.
 */
const getPermissionsWithNestedFields = (
  actions: readonly (Core.IsStrict extends true ? NestedFieldsAction : Action)[],
  { nestingLevel, restrictedSubjects = [] }: FieldOptions = {}
): Modules.Permissions.PermissionRule[] => {
  return actions.reduce<Modules.Permissions.PermissionRule[]>((permissions, action) => {
    const appliesToFields = actionDomain.appliesToProperty('fields', action);
    const validSubjects = (action.subjects ?? [])
      .filter((subject): subject is string => subject !== undefined)
      .filter((subject) => restrictedSubjects.includes(subject) === false);

    // Create a Permission for each subject within the action
    for (const subject of validSubjects) {
      let fields: string[] | undefined;

      if (appliesToFields === true) {
        if (isContentTypeUID(subject) === false) {
          continue;
        }

        fields = getNestedFields(strapi.contentTypes[subject], {
          components: strapi.components,
          nestingLevel,
        });
      }

      const permission = permissionDomain.create({
        action: action.actionId,
        subject,
        properties: { fields },
      });

      permissions.push(permission);
    }

    return permissions;
  }, []);
};

/**
 * Cleans permissions' fields (remove the ones that left the schema, replace a stored parent path
 * with its nested fields)
 */
const cleanPermissionFields = (
  permissions: Modules.Permissions.PermissionRule[]
): Modules.Permissions.PermissionRule[] => {
  const { actionProvider } = getService('permission');
  const nestedFieldsCache = new Map<string, string[]>();

  return permissions.map((permission: any) => {
    const {
      action: actionId,
      subject,
      properties: { fields },
    } = permission;

    const action = actionProvider.get(actionId) as any;

    // todo see if it's possible to check property on action + subject (async)
    if (!actionDomain.appliesToProperty('fields', action)) {
      return permissionDomain.deleteProperty('fields', permission);
    }

    if (!subject || !strapi.contentTypes[subject]) {
      return permission;
    }

    let possibleFields = nestedFieldsCache.get(subject);
    if (!possibleFields) {
      possibleFields = getNestedFieldsWithIntermediate(strapi.contentTypes[subject], {
        components: strapi.components,
      });
      nestedFieldsCache.set(subject, possibleFields);
    }

    const currentFields: string[] = fields || [];

    const validUserFields: string[] = [
      ...new Set(
        possibleFields.filter((pf) =>
          currentFields.some((cf) => pf === cf || pf.startsWith(`${cf}.`))
        )
      ),
    ];

    // A field is considered "not nested" if no other valid user field starts with this field's path followed by a dot.
    // This helps to remove redundant parent paths when a more specific child path is already included.
    // For example, if 'component.title' is present, 'component' would be filtered out by this condition.
    const isNotNestedField = (field: string) =>
      !validUserFields.some(
        (validUserField: string) =>
          validUserField !== field && validUserField.startsWith(`${field}.`)
      );

    // Filter out fields that are parent paths of other included fields.
    const newFields = validUserFields.filter(isNotNestedField);

    return permissionDomain.setProperty('fields', newFields, permission);
  }, []);
};

export {
  getNestedFields,
  getPermissionsWithNestedFields,
  cleanPermissionFields,
  getNestedFieldsWithIntermediate,
};
