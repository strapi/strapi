import { has, isPlainObject } from 'lodash/fp';

import type { Core, Modules } from '@strapi/types';

const ALLOWED_TYPES = [
  'biginteger',
  'boolean',
  'date',
  'datetime',
  'decimal',
  'email',
  'enumeration',
  'float',
  'integer',
  'json',
  'password',
  'richtext',
  'string',
  'text',
  'time',
  'uid',
] as const;

const customFieldsRegistry = (strapi: Core.Strapi) => {
  const customFields: Record<string, unknown> = {};

  return {
    getAll() {
      return customFields;
    },
    get(customField: string) {
      const registeredCustomField = customFields[customField];
      if (!registeredCustomField) {
        throw new Error(`Could not find Custom Field: ${customField}`);
      }

      return registeredCustomField;
    },
    add(
      customField:
        | Modules.CustomFields.CustomFieldServerOptions
        | Modules.CustomFields.CustomFieldServerOptions[]
    ) {
      const customFieldList = Array.isArray(customField) ? customField : [customField];

      for (const cf of customFieldList) {
        if (!has('name', cf) || !has('type', cf)) {
          throw new Error(`Custom fields require a 'name' and 'type' key`);
        }

        const { name, plugin, type, inputSize } = cf;
        if (!ALLOWED_TYPES.includes(type)) {
          throw new Error(
            `Custom field type: '${type}' is not a valid Strapi type or it can't be used with a Custom Field`
          );
        }

        const isValidObjectKey = /^(?![0-9])[a-zA-Z0-9$_-]+$/g;
        if (!isValidObjectKey.test(name)) {
          throw new Error(`Custom field name: '${name}' is not a valid object key`);
        }

        // Validate inputSize when provided
        if (inputSize) {
          if (
            !isPlainObject(inputSize) ||
            !has('default', inputSize) ||
            !has('isResizable', inputSize)
          ) {
            throw new Error(`inputSize should be an object with 'default' and 'isResizable' keys`);
          }
          if (![4, 6, 8, 12].includes(inputSize.default)) {
            throw new Error('Custom fields require a valid default input size');
          }
          if (typeof inputSize.isResizable !== 'boolean') {
            throw new Error('Custom fields should specify if their input is resizable');
          }
        }

        // When no plugin is specified, or it isn't found in Strapi, default to global
        const uid =
          plugin && strapi.plugin(plugin) ? `plugin::${plugin}.${name}` : `global::${name}`;

        if (has(uid, customFields)) {
          throw new Error(`Custom field: '${uid}' has already been registered`);
        }

        customFields[uid] = cf;
      }
    },
  };
};

export default customFieldsRegistry;
