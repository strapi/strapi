import _ from 'lodash';
import { yup } from '@strapi/utils';

import type { TestContext } from 'yup';
import type { Schema, Struct } from '@strapi/types';

import { modelTypes, VALID_UID_TARGETS } from '../../services/constants';
import {
  validators,
  areEnumValuesUnique,
  isValidDefaultJSON,
  isValidName,
  isValidEnum,
  isValidUID,
  isValidRegExpPattern,
} from './common';

export type GetTypeValidatorOptions = {
  types: ReadonlyArray<string>;
  attributes?: Struct.SchemaAttributes;
  modelType?: (typeof modelTypes)[keyof typeof modelTypes];
};

const maxLengthIsGreaterThanOrEqualToMinLength = {
  name: 'isGreaterThanMin',
  message: 'maxLength must be greater or equal to minLength',
  test(this: TestContext, value: unknown) {
    const { minLength } = this.parent;
    return !(!_.isUndefined(minLength) && !_.isUndefined(value) && (value as number) < minLength);
  },
};

export const getTypeValidator = (
  attribute: Schema.Attribute.AnyAttribute,
  { types, modelType, attributes }: GetTypeValidatorOptions
) => {
  return yup.object({
    type: yup
      .string()
      .oneOf([...types])
      .required(),
    configurable: yup.boolean().nullable(),
    private: yup.boolean().nullable(),
    pluginOptions: yup.object(),
    ...getTypeShape(attribute, { modelType, attributes }),
  } as any);
};

const getTypeShape = (attribute: Schema.Attribute.AnyAttribute, { attributes }: any = {}) => {
  switch (attribute.type) {
    /**
     * complex types
     */

    case 'media': {
      return {
        multiple: yup.boolean(),
        required: validators.required,
        allowedTypes: yup
          .array()
          .of(yup.string().oneOf(['images', 'videos', 'files', 'audios']))
          .min(1),
      };
    }

    case 'uid': {
      return {
        required: validators.required,
        targetField: yup
          .string()
          .oneOf(
            Object.keys(attributes!).filter((key) =>
              VALID_UID_TARGETS.includes(_.get(attributes![key] as any, 'type'))
            )
          )
          .nullable(),
        default: yup
          .string()
          .test(
            'isValidDefaultUID',
            'cannot define a default UID if the targetField is set',
            function (value) {
              const { targetField } = this.parent;
              return !!(_.isNil(targetField) || _.isNil(value));
            }
          )
          .test(isValidUID),
        minLength: validators.minLength,
        maxLength: validators.maxLength.max(256).test(maxLengthIsGreaterThanOrEqualToMinLength),
        options: yup.object().shape({
          separator: yup.string(),
          lowercase: yup.boolean(),
          decamelize: yup.boolean(),
          customReplacements: yup.array().of(yup.array().of(yup.string()).min(2).max(2)),
          preserveLeadingUnderscore: yup.boolean(),
        }),
      };
    }

    /**
     * scalar types
     */
    case 'string':
    case 'text': {
      return {
        default: yup.string(),
        required: validators.required,
        unique: validators.unique,
        minLength: validators.minLength,
        maxLength: validators.maxLength,
        regex: yup.string().test(isValidRegExpPattern),
      };
    }
    case 'richtext': {
      return {
        default: yup.string(),
        required: validators.required,
        minLength: validators.minLength,
        maxLength: validators.maxLength,
      };
    }
    case 'blocks': {
      return {
        required: validators.required,
      };
    }
    case 'json': {
      return {
        default: yup.mixed().test(isValidDefaultJSON),
        required: validators.required,
      };
    }
    case 'enumeration': {
      return {
        enum: yup
          .array()
          .of(yup.string().test(isValidEnum).required())
          .min(1)
          .test(areEnumValuesUnique)
          .required(),
        default: yup.string().when('enum', (enumVal) => yup.string().oneOf(enumVal)),
        enumName: yup.string().test(isValidName),
        required: validators.required,
      };
    }
    case 'password': {
      return {
        required: validators.required,
        minLength: validators.minLength,
        maxLength: validators.maxLength,
      };
    }
    case 'email': {
      return {
        default: yup.string().email(),
        required: validators.required,
        unique: validators.unique,
        minLength: validators.minLength,
        maxLength: validators.maxLength,
      };
    }
    case 'integer': {
      return {
        default: yup.number().integer(),
        required: validators.required,
        unique: validators.unique,
        min: yup.number().integer(),
        max: yup.number().integer(),
      };
    }
    case 'biginteger': {
      return {
        default: yup.string().nullable().matches(/^\d*$/),
        required: validators.required,
        unique: validators.unique,
        min: yup.string().nullable().matches(/^\d*$/),
        max: yup.string().nullable().matches(/^\d*$/),
      };
    }
    case 'float': {
      return {
        default: yup.number(),
        required: validators.required,
        unique: validators.unique,
        min: yup.number(),
        max: yup.number(),
      };
    }
    case 'decimal': {
      return {
        default: yup.number(),
        required: validators.required,
        unique: validators.unique,
        min: yup.number(),
        max: yup.number(),
      };
    }
    case 'time':
    case 'datetime':
    case 'date': {
      return {
        default: yup.string(),
        required: validators.required,
        unique: validators.unique,
      };
    }
    case 'boolean': {
      return {
        default: yup.boolean(),
        required: validators.required,
      };
    }

    case 'component': {
      return {
        required: validators.required,
        repeatable: yup.boolean(),
        // TODO: Add correct server validation for nested components
        component: yup.string().required(),
        min: yup.number(),
        max: yup.number(),
      };
    }

    case 'dynamiczone': {
      return {
        required: validators.required,
        components: yup
          .array()
          .of(yup.string().required())
          .test('isArray', '${path} must be an array', (value) => Array.isArray(value))
          .min(1),
        min: yup.number(),
        max: yup.number(),
      };
    }

    default: {
      return {};
    }
  }
};
