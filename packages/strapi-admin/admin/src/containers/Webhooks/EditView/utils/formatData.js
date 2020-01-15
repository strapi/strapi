import { set, setWith } from 'lodash';

const cleanData = data => {
  const webhooks = data;
  const headers = cleanHeaders(data.headers);

  set(webhooks, 'headers', unformatHeaders(headers));
  return webhooks;
};

const unformatHeaders = headers => {
  return headers.reduce((obj, item) => {
    const { key, value } = item;
    return {
      ...obj,
      [key]: value,
    };
  }, {});
};

const cleanHeaders = headers => {
  if (Object.keys(headers).length === 1) {
    const { key, value } = headers[0];
    if (key.length === 0 && value.length === 0) {
      return [];
    }
  }
  return headers;
};

const cleanErrors = errors => {
  return Object.keys(errors).reduce((acc, curr) => {
    const { id } = errors[curr];
    setWith(acc, curr, id ? id : errors[curr], Object);

    return acc;
  }, {});
};

export { cleanHeaders, cleanData, cleanErrors };
