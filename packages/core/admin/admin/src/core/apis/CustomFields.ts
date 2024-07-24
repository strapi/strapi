/* eslint-disable check-file/filename-naming-convention */
import invariant from 'invariant';

import type {
  CustomField,
  CustomFieldOption,
  CustomFieldOptionSection,
  CustomFieldUID,
} from '@strapi/helper-plugin';

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

const ALLOWED_ROOT_LEVEL_OPTIONS = [
  'min',
  'minLength',
  'max',
  'maxLength',
  'required',
  'regex',
  'enum',
  'unique',
  'private',
  'default',
] as const;

export class CustomFields {
  customFields: Record<string, CustomField>;

  constructor() {
    this.customFields = {};
  }

  register(customFields: CustomField | CustomField[]) {
    if (Array.isArray(customFields)) {
      // If several custom fields are passed, register them one by one
      customFields.forEach((customField) => {
        this.register(customField);
      });
    } else {
      // Handle individual custom field
      const { name, pluginId, type, intlLabel, intlDescription, components, options } =
        customFields;

      // Ensure required attributes are provided
      invariant(name, 'A name must be provided');
      invariant(type, 'A type must be provided');
      invariant(intlLabel, 'An intlLabel must be provided');
      invariant(intlDescription, 'An intlDescription must be provided');
      invariant(components, 'A components object must be provided');
      invariant(components.Input, 'An Input component must be provided');

      // Ensure the type is valid
      invariant(
        ALLOWED_TYPES.includes(type),
        `Custom field type: '${type}' is not a valid Strapi type or it can't be used with a Custom Field`
      );

      // Ensure name has no special characters
      const isValidObjectKey = /^(?![0-9])[a-zA-Z0-9$_-]+$/g;
      invariant(
        isValidObjectKey.test(name),
        `Custom field name: '${name}' is not a valid object key`
      );

      // Ensure options have valid name paths
      const allFormOptions = [...(options?.base || []), ...(options?.advanced || [])];

      if (allFormOptions.length) {
        const optionPathValidations = allFormOptions.reduce(optionsValidationReducer, []);

        optionPathValidations.forEach(({ isValidOptionPath, errorMessage }) => {
          invariant(isValidOptionPath, errorMessage);
        });
      }

      // When no plugin is specified, default to the global namespace
      const uid: CustomFieldUID = pluginId ? `plugin::${pluginId}.${name}` : `global::${name}`;

      // Ensure the uid is unique
      const uidAlreadyUsed = Object.prototype.hasOwnProperty.call(this.customFields, uid);
      invariant(!uidAlreadyUsed, `Custom field: '${uid}' has already been registered`);

      this.customFields[uid] = customFields;
    }
  }

  getAll() {
    return this.customFields;
  }

  get(uid: string): CustomField | undefined {
    return this.customFields[uid];
  }
}

interface OptionValidation {
  isValidOptionPath: boolean;
  errorMessage: string;
}

const optionsValidationReducer = (
  acc: OptionValidation[],
  option: CustomFieldOptionSection | CustomFieldOption
): OptionValidation[] => {
  if ('items' in option) {
    return option.items.reduce(optionsValidationReducer, acc);
  }

  if (!option.name) {
    acc.push({
      isValidOptionPath: false,
      errorMessage: "The 'name' property is required on an options object",
    });
  } else {
    acc.push({
      isValidOptionPath:
        option.name.startsWith('options') || ALLOWED_ROOT_LEVEL_OPTIONS.includes(option.name),
      errorMessage: `'${option.name}' must be prefixed with 'options.'`,
    });
  }

  return acc;
};
