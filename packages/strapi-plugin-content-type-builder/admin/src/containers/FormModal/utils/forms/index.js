import React, { Fragment } from 'react';
import * as yup from 'yup';
import { get, isEmpty, toLower, trim, toNumber } from 'lodash';
import { translatedErrors as errorsTrads } from 'strapi-helper-plugin';
import { FormattedMessage } from 'react-intl';
import getTrad from '../../../../utils/getTrad';
import { nameToSlug } from '../createUid';
import fields from './fields';
import { attributesForm } from '../attributes';
import { categoryForm, createCategorySchema } from '../category';
import { contentTypeForm, createContentTypeSchema } from '../contentType';
import { createComponentSchema, componentForm } from '../component';
import { dynamiczoneForm } from '../dynamicZone';
import { NAME_REGEX, ENUM_REGEX } from './regexes';

/* eslint-disable indent */
/* eslint-disable prefer-arrow-callback */

yup.addMethod(yup.mixed, 'defined', function() {
  return this.test('defined', errorsTrads.required, value => value !== undefined);
});

yup.addMethod(yup.string, 'unique', function(
  message,
  alreadyTakenAttributes,
  validator,
  category = ''
) {
  return this.test('unique', message, function(string) {
    if (!string) {
      return false;
    }

    return !alreadyTakenAttributes.includes(
      typeof validator === 'function' ? validator(string, category) : string.toLowerCase()
    );
  });
});

yup.addMethod(yup.array, 'hasNotEmptyValues', function(message) {
  return this.test('hasNotEmptyValues', message, function(array) {
    return !array.some(value => {
      return isEmpty(value);
    });
  });
});

yup.addMethod(yup.string, 'isAllowed', function(message, reservedNames) {
  return this.test('isAllowed', message, function(string) {
    if (!string) {
      return false;
    }

    return !reservedNames.includes(toLower(trim(string)));
  });
});

yup.addMethod(yup.string, 'isInferior', function(message, max) {
  return this.test('isInferior', message, function(min) {
    if (!min) {
      return false;
    }

    if (Number.isNaN(toNumber(min))) {
      return true;
    }

    return toNumber(max) >= toNumber(min);
  });
});

yup.addMethod(yup.array, 'matchesEnumRegex', function(message) {
  return this.test('matchesEnumRegex', message, function(array) {
    return array.every(value => {
      return ENUM_REGEX.test(value);
    });
  });
});

yup.addMethod(yup.string, 'isValidRegExpPattern', function(message) {
  return this.test('isValidRegExpPattern', message, function(string) {
    return new RegExp(string) !== null;
  });
});

const forms = {
  attribute: {
    schema(
      currentSchema,
      attributeType,
      dataToValidate,
      isEditing,
      attributeToEditName,
      initialData,
      alreadyTakenTargetContentTypeAttributes,
      reservedNames
    ) {
      const alreadyTakenAttributes = Object.keys(
        get(currentSchema, ['schema', 'attributes'], {})
      ).filter(attribute => {
        if (isEditing) {
          return attribute !== attributeToEditName;
        }

        return true;
      });

      // For relations
      let targetAttributeAlreadyTakenValue = dataToValidate.name
        ? [...alreadyTakenAttributes, dataToValidate.name]
        : alreadyTakenAttributes;

      if (
        isEditing &&
        attributeType === 'relation' &&
        dataToValidate.target === currentSchema.uid
      ) {
        targetAttributeAlreadyTakenValue = targetAttributeAlreadyTakenValue.filter(
          attribute => attribute !== initialData.targetAttribute
        );
      }

      // Common yup shape for most attributes
      const commonShape = {
        name: yup
          .string()
          .unique(errorsTrads.unique, alreadyTakenAttributes)
          .matches(NAME_REGEX, errorsTrads.regex)
          .isAllowed(getTrad('error.attributeName.reserved-name'), reservedNames.attributes)
          .required(errorsTrads.required),
        type: yup.string().required(errorsTrads.required),
        default: yup.string().nullable(),
        unique: yup.boolean().nullable(),
        required: yup.boolean(),
      };
      const numberTypeShape = {
        max: yup.lazy(() => {
          let schema = yup.number();

          if (
            attributeType === 'integer' ||
            attributeType === 'biginteger' ||
            attributeType === 'dynamiczone'
          ) {
            schema = schema.integer();
          }

          if (attributeType === 'dynamiczone') {
            schema = schema.positive();
          }

          return schema.nullable();
        }),
        min: yup.lazy(() => {
          let schema = yup.number();

          if (
            attributeType === 'integer' ||
            attributeType === 'biginteger' ||
            attributeType === 'dynamiczone'
          ) {
            schema = schema.integer();
          }

          if (attributeType === 'dynamiczone') {
            schema = schema.positive();
          }

          return schema
            .nullable()
            .when('max', (max, schema) => {
              if (max) {
                return schema.max(max, getTrad('error.validation.minSupMax'));
              }

              return schema;
            })
            .nullable();
        }),
      };
      const fieldsThatSupportMaxAndMinLengthShape = {
        maxLength: yup
          .number()
          .integer()
          .nullable(),
        minLength: yup
          .number()
          .integer()
          .when('maxLength', (maxLength, schema) => {
            if (maxLength) {
              return schema.max(maxLength, getTrad('error.validation.minSupMax'));
            }

            return schema;
          })
          .nullable(),
      };

      switch (attributeType) {
        case 'component':
          return yup.object().shape({
            ...commonShape,
            component: yup.string().required(errorsTrads.required),
            ...numberTypeShape,
          });
        case 'dynamiczone':
          return yup.object().shape({
            ...commonShape,
            ...numberTypeShape,
          });
        case 'enumeration':
          return yup.object().shape({
            name: yup
              .string()
              .isAllowed(getTrad('error.attributeName.reserved-name'), reservedNames.attributes)
              .unique(errorsTrads.unique, alreadyTakenAttributes)
              .matches(ENUM_REGEX, errorsTrads.regex)
              .required(errorsTrads.required),
            type: yup.string().required(errorsTrads.required),
            default: yup.string().nullable(),
            unique: yup.boolean().nullable(),
            required: yup.boolean(),
            enum: yup
              .array()
              .of(yup.string())
              .min(1, errorsTrads.min)
              .test({
                name: 'areEnumValuesUnique',
                message: getTrad('error.validation.enum-duplicate'),
                test: values => {
                  const filtered = [...new Set(values)];

                  return filtered.length === values.length;
                },
              })
              .matchesEnumRegex(errorsTrads.regex)
              .hasNotEmptyValues('Empty strings are not allowed', dataToValidate.enum),
            enumName: yup.string().nullable(),
          });
        case 'text':
          return yup.object().shape({
            ...commonShape,
            ...fieldsThatSupportMaxAndMinLengthShape,
            regex: yup
              .string()
              .isValidRegExpPattern(getTrad('error.validation.regex'))
              .nullable(),
          });
        case 'number':
        case 'integer':
        case 'biginteger':
        case 'float':
        case 'decimal': {
          if (dataToValidate.type === 'biginteger') {
            return yup.object().shape({
              ...commonShape,
              default: yup
                .string()
                .nullable()
                .matches(/^\d*$/),
              min: yup
                .string()
                .nullable()
                .matches(/^\d*$/)
                .when('max', (max, schema) => {
                  if (max) {
                    return schema.isInferior(getTrad('error.validation.minSupMax'), max);
                  }

                  return schema;
                }),

              max: yup
                .string()
                .nullable()
                .matches(/^\d*$/),
            });
          }

          let defaultType = yup.number();

          if (dataToValidate.type === 'integer') {
            defaultType = yup.number().integer('component.Input.error.validation.integer');
          }

          return yup.object().shape({
            ...commonShape,
            default: defaultType.nullable(),
            ...numberTypeShape,
          });
        }
        case 'relation':
          return yup.object().shape({
            name: yup
              .string()
              .isAllowed(getTrad('error.attributeName.reserved-name'), reservedNames.attributes)
              .matches(NAME_REGEX, errorsTrads.regex)
              .unique(errorsTrads.unique, alreadyTakenAttributes)
              .required(errorsTrads.required),
            targetAttribute: yup.lazy(() => {
              let schema = yup
                .string()
                .isAllowed(getTrad('error.attributeName.reserved-name'), reservedNames.attributes);

              if (!['oneWay', 'manyWay'].includes(dataToValidate.nature)) {
                schema = schema.matches(NAME_REGEX, errorsTrads.regex);
              }

              return schema
                .unique(errorsTrads.unique, targetAttributeAlreadyTakenValue)
                .unique(
                  getTrad('error.validation.relation.targetAttribute-taken'),
                  alreadyTakenTargetContentTypeAttributes
                )
                .required(errorsTrads.required);
            }),
            target: yup.string().required(errorsTrads.required),
            nature: yup.string().required(),
            dominant: yup.boolean().nullable(),
            unique: yup.boolean().nullable(),
          });
        default:
          return yup.object().shape({
            ...commonShape,
            ...fieldsThatSupportMaxAndMinLengthShape,
          });
      }
    },
    form: {
      advanced(data, type, step) {
        try {
          return attributesForm.advanced[type](data, step);
        } catch (err) {
          return { items: [] };
        }
      },
      base(data, type, step, actionType, attributes) {
        if (type === 'component' && step === '1') {
          const itemsToConcat =
            data.createComponent === true
              ? [[{ type: 'spacer' }]].concat(componentForm.base('componentToCreate.'))
              : [[{ type: 'spacer' }]];

          return {
            items: [[fields.createComponent], ...itemsToConcat],
          };
        }

        if (type === 'component' && step === '2') {
          return {
            items: [
              [
                fields.name,
                {
                  name: 'component',
                  type: 'componentSelect',
                  label: {
                    id: getTrad('modalForm.attributes.select-component'),
                  },
                  isMultiple: false,
                },
              ],
              [
                {
                  label: {
                    id: getTrad('modalForm.attribute.text.type-selection'),
                  },
                  name: 'repeatable',
                  type: 'booleanBox',
                  size: 12,
                  options: [
                    {
                      headerId: getTrad('form.attribute.component.option.repeatable'),
                      descriptionId: getTrad(
                        'form.attribute.component.option.repeatable.description'
                      ),
                      value: true,
                    },
                    {
                      headerId: getTrad('form.attribute.component.option.single'),
                      descriptionId: getTrad('form.attribute.component.option.single.description'),
                      value: false,
                    },
                  ],
                  validations: {},
                },
              ],
              [{ type: 'spacer' }],
            ],
          };
        }

        if (type === 'date') {
          return {
            items: [
              [
                fields.name,
                {
                  label: {
                    id: getTrad('modalForm.attribute.text.type-selection'),
                  },
                  name: 'type',
                  type: 'select',
                  options: [
                    { id: 'components.InputSelect.option.placeholder', value: '' },
                    {
                      id: 'form.attribute.item.date.type.date',
                      value: 'date',
                    },
                    {
                      id: 'form.attribute.item.date.type.datetime',
                      value: 'datetime',
                    },
                    // Not sure the ctm supports that one
                    // {
                    //   id: 'form.attribute.item.date.type.timestamp',
                    //   value: 'timestamp',
                    // },
                    { id: 'form.attribute.item.date.type.time', value: 'time' },
                  ].map(({ id, value }, index) => {
                    const disabled = index === 0;
                    const tradId = index === 0 ? id : getTrad(id);

                    return (
                      <FormattedMessage id={tradId} key={id}>
                        {msg => (
                          <option disabled={disabled} hidden={disabled} value={value}>
                            {msg}
                          </option>
                        )}
                      </FormattedMessage>
                    );
                  }),
                  validations: {
                    required: true,
                  },
                },
              ],
            ],
          };
        }

        if (type === 'enumeration') {
          return {
            items: [
              [fields.name],
              [
                {
                  autoFocus: false,
                  name: 'enum',
                  type: 'textarea',
                  size: 8,
                  label: {
                    id: getTrad('form.attribute.item.enumeration.rules'),
                  },
                  placeholder: {
                    id: getTrad('form.attribute.item.enumeration.placeholder'),
                  },
                  validations: {
                    required: true,
                  },
                },
              ],
            ],
          };
        }

        if (type === 'number') {
          return {
            items: [
              [
                fields.name,
                {
                  label: {
                    id: getTrad('form.attribute.item.number.type'),
                  },
                  name: 'type',
                  type: 'select',
                  options: [
                    { id: 'components.InputSelect.option.placeholder', value: '' },
                    {
                      id: 'form.attribute.item.number.type.integer',
                      value: 'integer',
                    },
                    {
                      id: 'form.attribute.item.number.type.biginteger',
                      value: 'biginteger',
                    },
                    {
                      id: 'form.attribute.item.number.type.decimal',
                      value: 'decimal',
                    },
                    { id: 'form.attribute.item.number.type.float', value: 'float' },
                  ].map(({ id, value }, index) => {
                    const disabled = index === 0;
                    const tradId = index === 0 ? id : getTrad(id);

                    return (
                      <FormattedMessage id={tradId} key={id}>
                        {msg => (
                          <option disabled={disabled} hidden={disabled} value={value}>
                            {msg}
                          </option>
                        )}
                      </FormattedMessage>
                    );
                  }),
                  validations: {
                    required: true,
                  },
                },
              ],
            ],
          };
        }

        if (type === 'media') {
          return {
            items: [
              [fields.name],
              [
                {
                  label: { id: getTrad('modalForm.attribute.text.type-selection') },
                  name: 'multiple',
                  size: 12,
                  type: 'booleanBox',
                  options: [
                    {
                      headerId: getTrad('form.attribute.media.option.multiple'),
                      descriptionId: getTrad('form.attribute.media.option.multiple.description'),
                      value: true,
                    },
                    {
                      headerId: getTrad('form.attribute.media.option.single'),
                      descriptionId: getTrad('form.attribute.media.option.single.description'),
                      value: false,
                    },
                  ],
                  validations: {},
                },
              ],
              [{ type: 'spacer-medium' }],
            ],
          };
        }

        if (type === 'relation') {
          return {
            items: [
              [
                {
                  type: 'relation',
                },
              ],
            ],
          };
        }

        if (type === 'text') {
          return {
            items: [
              [fields.name],
              [
                {
                  label: { id: getTrad('modalForm.attribute.text.type-selection') },
                  name: 'type',
                  size: 12,
                  type: 'booleanBox',
                  options: [
                    {
                      headerId: getTrad('form.attribute.text.option.short-text'),
                      descriptionId: getTrad('form.attribute.text.option.short-text.description'),
                      value: 'string',
                    },
                    {
                      headerId: getTrad('form.attribute.text.option.long-text'),
                      descriptionId: getTrad('form.attribute.text.option.long-text.description'),
                      value: 'text',
                    },
                  ],
                  validations: {},
                },
              ],
              [{ type: 'spacer-medium' }],
            ],
          };
        }

        if (type === 'uid') {
          const options = Object.keys(attributes)
            .filter(key => ['string', 'text'].includes(attributes[key].type))
            .map(key => ({ id: key, value: key }));

          return {
            items: [
              [
                {
                  ...fields.name,
                  placeholder: {
                    id: getTrad('modalForm.attribute.form.base.name.placeholder'),
                  },
                },
                {
                  label: {
                    id: getTrad('modalForm.attribute.target-field'),
                  },
                  name: 'targetField',
                  type: 'select',
                  options: [{ id: getTrad('none'), value: '' }, ...options].map((option, index) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <Fragment key={index}>
                      {index === 0 ? (
                        <FormattedMessage id={option.id}>
                          {msg => <option value={option.value}>{msg}</option>}
                        </FormattedMessage>
                      ) : (
                        <option value={option.value}>{option.value}</option>
                      )}
                    </Fragment>
                  )),
                  validations: {
                    required: true,
                  },
                },
              ],
            ],
          };
        }

        return {
          items: [[fields.name]],
        };
      },
    },
  },
  contentType: {
    schema(alreadyTakenNames, isEditing, ctUid, reservedNames) {
      const takenNames = isEditing
        ? alreadyTakenNames.filter(uid => uid !== ctUid)
        : alreadyTakenNames;

      return createContentTypeSchema(takenNames, reservedNames.models);
    },
    form: {
      base(data = {}, type, step, actionType) {
        if (actionType === 'create') {
          const value = data.name ? nameToSlug(data.name) : '';

          return contentTypeForm.base.create(value);
        }

        return contentTypeForm.base.edit();
      },
      advanced() {
        return contentTypeForm.advanced.default();
      },
    },
  },
  component: {
    schema(
      alreadyTakenAttributes,
      componentCategory,
      reservedNames,
      isEditing = false,
      compoUid = null
    ) {
      const takenNames = isEditing
        ? alreadyTakenAttributes.filter(uid => uid !== compoUid)
        : alreadyTakenAttributes;

      return createComponentSchema(takenNames, reservedNames.models, componentCategory);
    },
    form: {
      advanced() {
        return {
          items: componentForm.advanced(),
        };
      },
      base() {
        return {
          items: componentForm.base(),
        };
      },
    },
  },
  addComponentToDynamicZone: {
    form: {
      advanced() {
        return dynamiczoneForm.advanced.default();
      },
      base(data) {
        const isCreatingComponent = get(data, 'createComponent', false);

        if (isCreatingComponent) {
          return dynamiczoneForm.base.createComponent();
        }

        return dynamiczoneForm.base.default();
      },
    },
  },
  editCategory: {
    schema(allCategories, initialData) {
      const allowedCategories = allCategories
        .filter(cat => cat !== initialData.name)
        .map(cat => toLower(cat));

      return createCategorySchema(allowedCategories);
    },
    form: {
      base() {
        return categoryForm.base;
      },
    },
  },
};

export default forms;
