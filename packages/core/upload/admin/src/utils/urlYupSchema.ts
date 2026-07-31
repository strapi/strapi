import { translatedErrors as errorsTrads } from '@strapi/admin/strapi-admin';
import * as yup from 'yup';

import { getTrad } from './getTrad';

const MAX_URLS = 20;

export const urlSchema = yup.object().shape({
  urls: yup.string().test({
    name: 'isUrlValid',
    // eslint-disable-next-line no-template-curly-in-string
    message: '${path}',
    test(values = '') {
      const urls = values.split(/\r?\n/);

      /**
       * Messages are message descriptors rather than bare ids because these translations
       * interpolate values (`{min}`, `{max}`, `{number}`). Without `values`, react-intl
       * fails to format them and renders the raw placeholder. See strapi/strapi#19030.
       */
      if (urls.length === 0) {
        return this.createError({
          path: this.path,
          message: { ...errorsTrads.min, values: { min: 1 } },
        });
      }

      if (urls.length > MAX_URLS) {
        return this.createError({
          path: this.path,
          message: { ...errorsTrads.max, values: { max: MAX_URLS } },
        });
      }

      const filtered = urls.filter((val) => {
        try {
          // eslint-disable-next-line no-new
          new URL(val);

          return false;
        } catch (err) {
          // invalid url
          return true;
        }
      });

      const filteredLength = filtered.length;

      if (filteredLength === 0) {
        return true;
      }

      const errorMessage =
        filteredLength > 1
          ? {
              id: 'form.upload-url.error.url.invalids',
              defaultMessage: '{number} URLs are invalids',
            }
          : { id: 'form.upload-url.error.url.invalid', defaultMessage: 'One URL is invalid' };

      return this.createError({
        path: this.path,
        message: {
          ...errorMessage,
          id: getTrad(errorMessage.id),
          values: { number: filteredLength },
        },
      });
    },
  }),
});
