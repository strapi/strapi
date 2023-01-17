import * as yup from 'yup';
import { translatedErrors as errorsTrads } from '@strapi/helper-plugin';
import getTrad from './getTrad';

export const urlSchema = yup.object().shape({
  urls: yup.string().test({
    name: 'isUrlValid',
    message: '${path}',
    test(values = '') {
      const urls = values.split(/\r?\n/);

      if (urls.length === 0) {
        return this.createError({
          path: this.path,
          message: errorsTrads.min,
        });
      }

      if (urls.length > 20) {
        return this.createError({
          path: this.path,
          message: errorsTrads.max,
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
          ? 'form.upload-url.error.url.invalids'
          : 'form.upload-url.error.url.invalid';

      return this.createError({
        path: this.path,
        message: getTrad(errorMessage),
        params: { number: filtered.length },
      });
    },
  }),
});
