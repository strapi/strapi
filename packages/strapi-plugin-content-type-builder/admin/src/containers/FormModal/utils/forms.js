import * as yup from 'yup';
import { translatedErrors as errorsTrads } from 'strapi-helper-plugin';
import pluginId from '../../../pluginId';
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
