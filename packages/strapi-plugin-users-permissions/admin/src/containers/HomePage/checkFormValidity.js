import { get, isEmpty } from 'lodash';

export default function checkFormValidity(settingType, data) {
  const formErrors = [];

  switch (settingType) {
    case 'providers': {
      const isProviderEnabled = get(data, 'enabled');
      const keys = [ 'key', 'secret' ];

      keys.map(key => {
        if (isProviderEnabled && isEmpty(get(data, key))) {
          formErrors.push({ name: key, errors: [{ id: 'components.Input.error.validation.required' }] });
        }
      });
      break;
    }
    default:

  }

  return formErrors;
}
