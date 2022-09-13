import { get } from 'lodash';

const createPossibleMainFieldsForModelsAndComponents = (array) => {
  return array.reduce((acc, current) => {
    const attributes = get(current, ['attributes'], {});
    const possibleMainFields = Object.keys(attributes).filter((attr) => {
      return ![
        'boolean',
        'component',
        'dynamiczone',
        'json',
        'media',
        'password',
        'relation',
        'text',
        'richtext',
      ].includes(get(attributes, [attr, 'type'], ''));
    });

    acc[current.uid] = possibleMainFields;

    return acc;
  }, {});
};

export default createPossibleMainFieldsForModelsAndComponents;
