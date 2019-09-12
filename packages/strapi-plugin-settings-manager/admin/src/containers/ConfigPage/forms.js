import * as yup from 'yup';
import { translatedErrors } from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
const forms = {
  application: {
    inputs: [
      [
        {
          label: {
            id: `${pluginId}.form.application.item.name`,
          },
          name: 'application.name',
          type: 'text',
          placeholder: `${pluginId}.form.application.item.name`,
          validations: {
            required: true,
            maxLength: 255,
          },
        },
      ],
      [
        {
          label: {
            id: `${pluginId}.form.application.item.description`,
          },
          name: 'application.description',
          type: 'text',
          placeholder: `${pluginId}.form.application.item.description`,
          validations: {
            maxLength: 255,
            required: true,
          },
        },
      ],
      [
        {
          label: {
            id: `${pluginId}.form.application.item.version`,
          },
          name: 'package.version',
          type: 'text',
          placeholder: `${pluginId}.form.application.item.version`,
          validations: {
            required: true,
          },
        },
      ],
    ],
    schema: yup.object({
      'application.name': yup
        .string()
        .max(255, translatedErrors.maxLength)
        .required(translatedErrors.required),
      'application.description': yup
        .string()
        .max(255, translatedErrors.maxLength)
        .required(translatedErrors.required),
      'package.version': yup
        .string()
        .max(255, translatedErrors.maxLength)
        .required(translatedErrors.required),
    }),
  },
};

export default forms;
