import { get, isEmpty } from 'lodash';

const displayErrors = error => {
  const errorObject = get(error, ['response', 'payload', 'error'], {});

  if (isEmpty(errorObject)) {
    strapi.notification.error('notification.error');
  }

  Object.values(errorObject).forEach(errorArray => {
    strapi.notification.error(errorArray.join(' '));
  });
};

export default displayErrors;
