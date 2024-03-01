import type { IconByType } from '../../AttributeIcon';
import type { Internal } from '@strapi/types';

export const getAttributesToDisplay = (
  dataTarget = '',
  targetUid: Internal.UID.Schema,
  nestedComponents: Array<Internal.UID.Schema>
): IconByType[][] => {
  const defaultAttributes: IconByType[] = [
    'text',
    'boolean',
    'blocks',
    'json',
    'number',
    'email',
    'date',
    'password',
    'media',
    'enumeration',
    'relation',
    'richtext',
  ];

  const isPickingAttributeForAContentType = dataTarget === 'contentType';
  const isNestedInAnotherComponent = nestedComponents.includes(targetUid);
  const canAddComponentInAnotherComponent =
    !isPickingAttributeForAContentType && !isNestedInAnotherComponent;

  if (isPickingAttributeForAContentType) {
    return [
      // Insert UID before the last item (richtext)
      [...defaultAttributes.slice(0, -1), 'uid', ...defaultAttributes.slice(-1)],
      ['component', 'dynamiczone'],
    ];
  }

  if (canAddComponentInAnotherComponent) {
    return [defaultAttributes, ['component']];
  }

  return [defaultAttributes];
};
