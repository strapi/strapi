import type { Schema } from '@strapi/types';

const createPossibleMainFieldsForModelsAndComponents = (
  array: Array<Schema.ContentType | Schema.Component>
) => {
  return array.reduce((acc, current) => {
    const attributes = current?.attributes ?? {};
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
        'blocks',
      ].includes(attributes?.[attr]?.type ?? '');
    });

    acc[current.uid] = possibleMainFields;

    return acc;
  }, {} as Record<string, string[]>);
};

export { createPossibleMainFieldsForModelsAndComponents };
