import { transform } from 'lodash';
import { prefixFileUrlWithBackendUrl } from '@strapi/helper-plugin';

export const prefixAllUrls = data =>
  transform(
    data,
    (result, value, key) => {
      if (value && value.url) {
        result[key] = { ...value, url: prefixFileUrlWithBackendUrl(value.url) };
      } else {
        result[key] = value;
      }
    },
    {}
  );
