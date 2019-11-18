const getAttributes = () => {
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
    ['component', 'dynamiczone'],
  ];

  return defaultAttributes;
};

export default getAttributes;
