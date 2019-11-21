const getAttributes = (dataTarget = '') => {
  const defaultAttributes = [
    [
      'text',
      'email',
      'richtext',
      'password',
      'number',
      'enumeration',
      'date',
      'media',
      'boolean',
      'json',
      // 'uid',
      'relation',
    ],
    ['component'],
  ];

  const items = defaultAttributes.slice();

  if (dataTarget !== 'component' && dataTarget !== 'components') {
    items[1].push('dynamiczone');
  }

  return items;
};

export default getAttributes;
