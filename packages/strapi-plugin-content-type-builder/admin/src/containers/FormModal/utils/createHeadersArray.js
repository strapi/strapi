import { set } from 'lodash';

const ALLOWED_KEYS = [
  'header_label',
  'header_icon_name',
  'header_icon_isCustom',
  'header_info_category',
  'header_info_name',
];
const createHeadersArray = obj => {
  const array = Object.keys(obj).reduce((acc, current) => {
    const splitted = current.split('_');
    const currentKeys = splitted.filter((_, i) => i !== splitted.length - 1);

    if (ALLOWED_KEYS.includes(currentKeys.join('_'))) {
      const currentKeysIndex = parseInt(splitted[splitted.length - 1] - 1, 10);
      const path = [
        currentKeysIndex,
        ...currentKeys.filter(key => key !== 'header'),
      ];

      let value = obj[current];

      if (current.includes('isCustom')) {
        value = obj[current] === 'true';
      }

      set(acc, path, value);
    }

    return acc;
  }, []);

  return array.filter(obj => obj.label !== null);
};

export default createHeadersArray;
