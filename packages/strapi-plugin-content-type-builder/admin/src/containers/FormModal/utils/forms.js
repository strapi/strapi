import React from 'react';
import * as yup from 'yup';
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

yup.addMethod(yup.string, 'unique', function(message, allReadyTakenValues) {
  return this.test('unique', message, function(string) {
    if (!string) {
      return false;
    }

    return !allReadyTakenValues.includes(createUid(string));
  });
});

const forms = {
  attribute: {
    schema() {
      return yup.object().shape({
        name: yup.string().required(errorsTrads.required),
        type: yup.string().required(errorsTrads.required),
      });
    },
    form: {
      advanced() {
        return {
          items: [[]],
        };
      },
      base(data, type) {
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

        if (type === 'text') {
          items[0].push({
            label: {
              id: getTrad('modalForm.attribute.text.type-selection'),
            },
            name: 'type',
            type: 'select',
            options: [
              { id: 'components.InputSelect.option.placeholder', value: '' },
              { id: 'form.attribute.text.option.short-text', value: 'string' },
              { id: 'form.attribute.text.option.long-text', value: 'text' },
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

        return {
          items,
        };
      },
    },
  },
  contentType: {
    schema(allReadyTakenValues) {
      return yup.object().shape({
        name: yup
          .string()
          .unique(errorsTrads.unique, allReadyTakenValues)
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
            // Maybe for later
            // [
            //   {
            //     name: 'repeatable',
            //     type: 'customBooleanContentType',
            //     value: true,
            //     title: 'Something',
            //     description: 'Cool',
            //     icon: 'multipleFiles',
            //   },
            // ],
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
