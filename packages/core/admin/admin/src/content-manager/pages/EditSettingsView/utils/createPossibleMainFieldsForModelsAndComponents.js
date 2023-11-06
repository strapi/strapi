const createPossibleMainFieldsForModelsAndComponents = (array) => {
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
  }, {});
};

export default createPossibleMainFieldsForModelsAndComponents;
