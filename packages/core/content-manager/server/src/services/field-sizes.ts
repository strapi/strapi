import { errors } from '@strapi/utils';
import type { Core, Modules } from '@strapi/types';

const { ApplicationError } = errors;

type FieldSize = Modules.CustomFields.CustomFieldServerOptions['inputSize'];

const needsFullSize: FieldSize = {
  default: 12,
  isResizable: false,
};

const smallSize: FieldSize = {
  default: 4,
  isResizable: true,
};

const defaultSize: FieldSize = {
  default: 6,
  isResizable: true,
};

const fieldSizes: Record<string, FieldSize> = {
  // Full row and not resizable
  dynamiczone: needsFullSize,
  component: needsFullSize,
  json: needsFullSize,
  richtext: needsFullSize,
  blocks: needsFullSize,
  // Small and resizable
  checkbox: smallSize,
  boolean: smallSize,
  date: smallSize,
  time: smallSize,
  biginteger: smallSize,
  decimal: smallSize,
  float: smallSize,
  integer: smallSize,
  number: smallSize,
  // Medium and resizable
  datetime: defaultSize,
  email: defaultSize,
  enumeration: defaultSize,
  media: defaultSize,
  password: defaultSize,
  relation: defaultSize,
  string: defaultSize,
  text: defaultSize,
  timestamp: defaultSize,
  uid: defaultSize,
};

const createFieldSizesService = ({ strapi }: { strapi: Core.Strapi }) => {
  const fieldSizesService = {
    getAllFieldSizes() {
      return fieldSizes;
    },

    hasFieldSize(type: string) {
      return !!fieldSizes[type];
    },

    getFieldSize(type?: string) {
      if (!type) {
        throw new ApplicationError('The type is required');
      }

      const fieldSize = fieldSizes[type];
      if (!fieldSize) {
        throw new ApplicationError(`Could not find field size for type ${type}`);
      }

      return fieldSize;
    },

    setFieldSize(type: string, size: FieldSize) {
      if (!type) {
        throw new ApplicationError('The type is required');
      }

      if (!size) {
        throw new ApplicationError('The size is required');
      }

      fieldSizes[type] = size;
    },

    setCustomFieldInputSizes() {
      // Find all custom fields already registered
      const customFields = strapi.get('custom-fields').getAll();

      // If they have a custom field size, register it
      // TODO types can be inferred when customFields is typed
      Object.entries(customFields).forEach(([uid, customField]: [string, any]) => {
        if (customField.inputSize) {
          fieldSizesService.setFieldSize(uid, customField.inputSize);
        }
      });
    },
  };

  return fieldSizesService;
};

export default createFieldSizesService;
