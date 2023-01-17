import transform from 'lodash/transform';
import { prefixFileUrlWithBackendUrl } from '@strapi/helper-plugin';

const prefixAllUrls = (data) =>
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

export default prefixAllUrls;
