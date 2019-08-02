'use strict';

const yup = require('yup');
const {
  validators,
  VALID_TYPES,
  isValidName,
  isValidEnum,
} = require('./common');

module.exports = obj => {
  return {
    type: yup
      .string()
      .oneOf(VALID_TYPES)
      .required(),
    ...getTypeShape(obj),
  };
};

const getTypeShape = obj => {
  switch (obj.type) {
    /**
     * complexe types
     */

    case 'media': {
      return {
        multiple: yup.boolean(),
        required: validators.required,
        unique: validators.unique,
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
    case 'json': {
      return {
        required: validators.required,
        unique: validators.unique,
      };
    }
    case 'enumeration': {
      return {
        enum: yup
          .array()
          .of(yup.string().test(isValidEnum))
          .min(1)
          .required(),
        default: yup
          .string()
          .when('enum', enumVal => yup.string().oneOf(enumVal)),
        enumName: yup.string().test(isValidName),
        required: validators.required,
        unique: validators.unique,
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
        default: yup
          .string()
          .nullable()
          .matches(/^\d*$/),
        required: validators.required,
        unique: validators.unique,
        min: yup
          .string()
          .nullable()
          .matches(/^\d*$/),
        max: yup
          .string()
          .nullable()
          .matches(/^\d*$/),
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
        unique: validators.unique,
      };
    }
    default: {
      return {};
    }
  }
};
