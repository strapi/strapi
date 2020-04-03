/* eslint-disable no-template-curly-in-string */
import * as yup from 'yup';
import { translatedErrors as errorsTrads } from 'strapi-helper-plugin';
import getTrad from './getTrad';

const urlSchema = yup.object().shape({
  filesToDownload: yup
    .array()
    .of(yup.string())

    .test({
      name: 'isUrlValid',
      message: '${path}',
      test(values) {
        const filtered = values.filter(val => {
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
          params: { wrongURLsNumber: filtered.length },
        });
      },
    })
    .min(0, errorsTrads.min)
    .max(20, errorsTrads.max),
});

export default urlSchema;
