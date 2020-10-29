const getAttributes = (dataTarget = '', targetUid, nestedComponents, customFields = []) => {
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
      'relation',
    ],
  ];

  const isPickingAttributeForAContentType = dataTarget === 'contentType';
  const isNestedInAnotherComponent = nestedComponents.includes(targetUid);
  const canAddComponentInAnotherComponent =
    !isPickingAttributeForAContentType && !isNestedInAnotherComponent;
  const items = defaultAttributes.slice();

  if (isPickingAttributeForAContentType) {
    items[0].push('uid');
    items.push(['component', 'dynamiczone']);
  }

  if (canAddComponentInAnotherComponent) {
    items.push(['component']);
  }

  if (customFields.length) {
    const alreadyPresentFields = items.flat();
    const uniqueCustomFields = customFields.filter(field => !alreadyPresentFields.includes(field));

    if (uniqueCustomFields.length) {
      items.push(uniqueCustomFields);
    }
  }

  return items;
};

export default getAttributes;
