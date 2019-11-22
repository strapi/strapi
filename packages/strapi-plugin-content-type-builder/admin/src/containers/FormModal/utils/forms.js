import React from 'react';
import * as yup from 'yup';
import { get, isEmpty } from 'lodash';
import { translatedErrors as errorsTrads } from 'strapi-helper-plugin';
import { FormattedMessage } from 'react-intl';
import pluginId from '../../../pluginId';
import getTrad from '../../../utils/getTrad';
import { createUid, nameToSlug } from './createUid';

yup.addMethod(yup.mixed, 'defined', function() {
  return this.test(
    'defined',
    errorsTrads.required,
    value => value !== undefined
  );
});

yup.addMethod(yup.string, 'unique', function(
  message,
  alreadyTakenAttributes,
  validator
) {
  return this.test('unique', message, function(string) {
    if (!string) {
      return false;
    }

    return !alreadyTakenAttributes.includes(
      typeof validator === 'function' ? validator(string) : string
    );
  });
});

yup.addMethod(yup.array, 'hasNotEmptyValues', function(message) {
  return this.test('hasNotEmptyValues', message, function(array) {
    return !array.some(value => isEmpty(value));
  });
});

const ATTRIBUTES_THAT_DONT_HAVE_MIN_MAX_SETTINGS = [
  'boolean',
  'date',
  'enumeration',
  'media',
];

const forms = {
  attribute: {
    schema(
      currentSchema,
      attributeType,
      dataToValidate,
      isEditing,
      attributeToEditName,
      initialData
    ) {
      console.log({ currentSchema });
      console.log({ attributeType });
      console.log({ dataToValidate });
      console.log({ isEditing });
      console.log({ attributeToEditName });
      console.log({ initialData });
      const alreadyTakenAttributes = Object.keys(
        get(currentSchema, ['schema', 'attributes'], {})
      ).filter(attribute => {
        if (isEditing) {
          return attribute !== attributeToEditName;
        }

        return true;
      });

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

      const commonShape = {
        name: yup
          .string()
          .unique(errorsTrads.unique, alreadyTakenAttributes)
          .required(errorsTrads.required),
        type: yup.string().required(errorsTrads.required),
        default: yup.string().nullable(),
        unique: yup.boolean().nullable(),
        required: yup.boolean(),
      };
      const numberTypeShape = {
        max: yup.lazy(() => {
          let schema = yup.number();

          if (attributeType === 'integer' || attributeType === 'biginteger') {
            schema = schema.integer();
          }

          return schema.nullable();
        }),
        min: yup.lazy(() => {
          let schema = yup.number();

          if (attributeType === 'integer' || attributeType === 'biginteger') {
            schema = schema.integer();
          }

          return schema
            .nullable()
            .when('max', (max, schema) => {
              if (max) {
                return schema.lessThan(
                  max,
                  getTrad('error.validation.minSupMax')
                );
              } else {
                return schema;
              }
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
              return schema.lessThan(
                maxLength,
                getTrad('error.validation.minSupMax')
              );
            } else {
              return schema;
            }
          })
          .nullable(),
      };

      switch (attributeType) {
        case 'enumeration':
          return yup.object().shape({
            ...commonShape,
            enum: yup
              .array()
              .of(yup.string())
              .min(1, errorsTrads.min)
              .hasNotEmptyValues(
                'Empty strings are not allowed',
                dataToValidate.enum
              ),
            enumName: yup.string().nullable(),
          });
        case 'number':
        case 'integer':
        case 'biginteger':
        case 'float':
        case 'decimal':
          return yup.object().shape({
            ...commonShape,
            ...numberTypeShape,
          });
        case 'relation':
          return yup.object().shape({
            name: yup
              .string()
              .unique(errorsTrads.unique, alreadyTakenAttributes)
              .required(errorsTrads.required),
            targetAttribute: yup
              .string()
              .unique(errorsTrads.unique, targetAttributeAlreadyTakenValue)
              .required(errorsTrads.required),
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
      advanced(data, type) {
        const targetAttributeValue = get(data, 'targetAttribute', null);
        const nameValue = get(data, 'name', null);
        const relationItems = [
          [
            {
              type: 'divider',
            },
          ],
          [
            {
              autoFocus: false,
              name: 'unique',
              type: 'checkbox',
              label: {
                id: getTrad('form.attribute.item.uniqueField'),
              },
              description: {
                id: getTrad('form.attribute.item.uniqueField.description'),
              },
              validations: {},
            },
          ],
          [
            {
              autoFocus: false,
              disabled: nameValue === null,
              name: 'columnName',
              type: 'addon',
              addon: nameValue,
              label: {
                id: getTrad('form.attribute.item.customColumnName'),
              },
              inputDescription: {
                id: getTrad('form.attribute.item.customColumnName.description'),
              },
              validations: {},
            },
            {
              autoFocus: false,
              disabled:
                targetAttributeValue === null || targetAttributeValue === '-',
              name: 'targetColumnName',
              label: '',
              type: 'addon',
              addon: targetAttributeValue,
              validations: {},
            },
          ],
        ];

        const defaultItems = [
          [
            {
              autoFocus: true,
              name: 'default',
              type: type === 'email' ? 'email' : 'text',
              label: {
                id: getTrad('form.attribute.settings.default'),
              },
              validations: {},
            },
          ],
          [
            {
              type: 'divider',
            },
          ],
          [
            {
              autoFocus: false,
              name: 'required',
              type: 'checkbox',
              label: {
                id: getTrad('form.attribute.item.requiredField'),
              },
              description: {
                id: getTrad('form.attribute.item.requiredField.description'),
              },
              validations: {},
            },
          ],
          [
            {
              autoFocus: false,
              name: 'unique',
              type: 'checkbox',
              label: {
                id: getTrad('form.attribute.item.uniqueField'),
              },
              description: {
                id: getTrad('form.attribute.item.uniqueField.description'),
              },
              validations: {},
            },
          ],
        ];

        const items = defaultItems.slice();

        if (type === 'media') {
          items.splice(0, 1);
        }

        if (type === 'boolean') {
          items.splice(0, 1, [
            {
              autoFocus: false,
              name: 'default',
              type: 'enum',
              label: {
                id: getTrad('form.attribute.settings.default'),
              },
              options: [
                { value: 'true', label: 'TRUE' },
                { value: '', label: 'NULL' },
                { value: 'false', label: 'FALSE' },
              ],
              validations: {},
            },
          ]);
        }

        if (type === 'enumeration') {
          items.splice(0, 1, [
            {
              autoFocus: false,
              name: 'default',
              type: 'select',
              label: {
                id: getTrad('form.attribute.settings.default'),
              },
              validations: {},
              options: [
                <FormattedMessage
                  key="hidden___value__placeholder"
                  id={'components.InputSelect.option.placeholder'}
                >
                  {msg => <option value="">{msg}</option>}
                </FormattedMessage>,
              ].concat(
                data.enum
                  ? data.enum
                      .filter(
                        (val, index) =>
                          data.enum.indexOf(val) === index && !isEmpty(val)
                      )
                      .map(val => (
                        <option key={val} value={val}>
                          {val}
                        </option>
                      ))
                  : []
              ),
            },
          ]);
          items.splice(1, 1, [
            {
              label: {
                id: getTrad('form.attribute.item.enumeration.graphql'),
              },
              name: 'enumName',
              type: 'text',
              validations: {},
              description: {
                id: getTrad(
                  'form.attribute.item.enumeration.graphql.description'
                ),
              },
            },
          ]);
        }

        if (type === 'date') {
          items.splice(0, 1, [
            {
              autoFocus: false,
              name: 'default',
              type: 'date',
              label: {
                id: getTrad('form.attribute.settings.default'),
              },
              validations: {},
              value: null,
              withDefaultValue: false,
              disabled: data.type !== 'date',
            },
          ]);
        }

        if (!ATTRIBUTES_THAT_DONT_HAVE_MIN_MAX_SETTINGS.includes(type)) {
          items.push(
            [
              {
                autoFocus: false,
                name: type === 'number' ? 'max' : 'maxLength',
                type: 'customCheckboxWithChildren',
                label: {
                  id: getTrad(
                    `form.attribute.item.maximum${
                      type === 'number' ? '' : 'Length'
                    }`
                  ),
                },

                validations: {},
              },
            ],
            [
              {
                autoFocus: false,
                name: type === 'number' ? 'min' : 'minLength',
                type: 'customCheckboxWithChildren',
                label: {
                  id: getTrad(
                    `form.attribute.item.minimum${
                      type === 'number' ? '' : 'Length'
                    }`
                  ),
                },
                validations: {},
              },
            ]
          );
        }

        if (type === 'relation') {
          return {
            items: relationItems,
          };
        }

        return {
          items,
        };
      },
      base(data, type) {
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

        const items = [
          [
            {
              autoFocus: true,
              name: 'name',
              type: 'text',
              label: {
                id: getTrad('modalForm.attribute.form.base.name'),
              },
              description: {
                id: getTrad('modalForm.attribute.form.base.name.description'),
              },
              validations: {
                required: true,
              },
            },
          ],
        ];

        if (type === 'text' || type === 'media') {
          items.push([
            {
              label: {
                id: getTrad('modalForm.attribute.text.type-selection'),
              },
              name: type === 'text' ? 'type' : 'multiple',
              type: 'booleanBox',
              size: 12,
              options: [
                {
                  headerId: getTrad(
                    `form.attribute.${type}.option.${
                      type === 'text' ? 'short-text' : 'multiple'
                    }`
                  ),
                  descriptionId: getTrad(
                    `form.attribute.${type}.option.${
                      type === 'text' ? 'short-text' : 'multiple'
                    }.description`
                  ),
                  value: type === 'text' ? 'string' : true,
                },
                {
                  headerId: getTrad(
                    `form.attribute.${type}.option.${
                      type === 'text' ? 'long-text' : 'single'
                    }`
                  ),
                  descriptionId: getTrad(
                    `form.attribute.${type}.option.${
                      type === 'text' ? 'long-text' : 'single'
                    }.description`
                  ),
                  value: type === 'text' ? 'text' : false,
                },
              ],
              validations: {},
            },
          ]);
        }

        if (type === 'number') {
          items[0].push({
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
          });
        }

        if (type === 'date') {
          items[0].push({
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
          });
        }

        if (type === 'enumeration') {
          items.push([
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
          ]);
        }

        return {
          items,
        };
      },
    },
  },
  contentType: {
    schema(alreadyTakenAttributes) {
      return yup.object().shape({
        name: yup
          .string()
          .unique(errorsTrads.unique, alreadyTakenAttributes, createUid)
          .required(errorsTrads.required),
        collectionName: yup.string(),
      });
    },
    form: {
      base(data = {}) {
        return {
          items: [
            [
              {
                autoFocus: true,
                name: 'name',
                type: 'text',
                label: {
                  id: `${pluginId}.contentType.displayName.label`,
                },
                validations: {
                  required: true,
                },
              },
              {
                description: {
                  id: `${pluginId}.contentType.UID.description`,
                },
                label: 'UID',
                name: 'uid',
                type: 'text',
                readOnly: true,
                disabled: true,
                value: data.name ? nameToSlug(data.name) : '',
              },
            ],
          ],
        };
      },
      advanced() {
        return {
          items: [
            [
              {
                autoFocus: true,
                label: {
                  id: `${pluginId}.contentType.collectionName.label`,
                },
                description: {
                  id: `${pluginId}.contentType.collectionName.description`,
                },
                name: 'collectionName',
                type: 'text',
                validations: {},
              },
            ],
          ],
        };
      },
    },
  },
};

export default forms;
