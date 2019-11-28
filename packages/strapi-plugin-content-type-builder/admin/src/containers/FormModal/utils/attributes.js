const getAttributes = (dataTarget = '', targetUid, nestedComponents) => {
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
  ];

  const isPickingAttributeForAContentType = dataTarget === 'contentType';
  const isNestedInAnotherComponent = nestedComponents.includes(targetUid);
  const canAddComponentInAnotherComponent =
    !isPickingAttributeForAContentType && !isNestedInAnotherComponent;
  const items = defaultAttributes.slice();

  if (isPickingAttributeForAContentType) {
    items.push(['component', 'dynamiczone']);
  }

  if (canAddComponentInAnotherComponent) {
    items.push(['component']);
  }

  return items;
};

export default getAttributes;
