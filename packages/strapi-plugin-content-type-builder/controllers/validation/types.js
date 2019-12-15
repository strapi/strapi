'use strict';

const yup = require('yup');
const { validators, isValidName, isValidEnum } = require('./common');
const { hasComponent } = require('../../utils/attributes');
const { modelTypes } = require('./constants');

const getTypeShape = (attribute, { modelType } = {}) => {
  switch (attribute.type) {
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
          .of(
            yup
              .string()
              .test(isValidEnum)
              .required()
          )
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

    case 'component': {
      return {
        required: validators.required,
        repeatable: yup.boolean(),
        component: yup
          .string()
          .test({
            name: 'Check max component nesting is 1 lvl',
            test: function(compoUID) {
              const targetCompo = strapi.components[compoUID];
              if (!targetCompo) return true; // ignore this error as it will fail beforehand

              if (
                modelType === modelTypes.COMPONENT &&
                hasComponent(targetCompo)
              ) {
                return this.createError({
                  path: this.path,
                  message: `${targetCompo.modelName} already as a nested compoent. You cannot have more than one level of nesting inside your components.`,
                });
              }
              return true;
            },
          })
          .required(),
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
          .test('isArray', '${path} must be an array', value =>
            Array.isArray(value)
          ),
        min: yup.number(),
        max: yup.number(),
      };
    }

    default: {
      return {};
    }
  }
};

module.exports = {
  getTypeShape,
};
