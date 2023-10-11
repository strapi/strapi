import type { IconByType } from '../../AttributeIcon';
import type { UID } from '@strapi/types';

export const getAttributesToDisplay = (
  dataTarget = '',
  targetUid: UID.Any,
  nestedComponents: Array<UID.Any>
): IconByType[][] => {
  const defaultAttributes: IconByType[] = [
    'text',
    'email',
    'richtext',
    'password',
    'blocks',
    'number',
    'enumeration',
    'date',
    'media',
    'boolean',
    'json',
    'relation',
  ];

  const isPickingAttributeForAContentType = dataTarget === 'contentType';
  const isNestedInAnotherComponent = nestedComponents.includes(targetUid);
  const canAddComponentInAnotherComponent =
    !isPickingAttributeForAContentType && !isNestedInAnotherComponent;

  if (isPickingAttributeForAContentType) {
    return [
      [...defaultAttributes, 'uid'],
      ['component', 'dynamiczone'],
    ];
  }

  if (canAddComponentInAnotherComponent) {
    return [defaultAttributes, ['component']];
  }

  return [defaultAttributes];
};
