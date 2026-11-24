import { IconButton } from '@strapi/design-system';
import { Drag } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { getTranslationKey } from '../../../../utils/translations';

import { REORDER_HANDLE_PROPS, type AssetSortable } from './assetSortable';

interface ReorderHandleProps {
  name: string;
  handle: AssetSortable['handle'];
}

/**
 * The keyboard path into reordering (Space picks the item up, arrows move it,
 * Space drops it). Pointer drags start from anywhere on the item, this grip
 * included.
 */
export const ReorderHandle = ({ name, handle }: ReorderHandleProps) => {
  const { formatMessage } = useIntl();
  const { ref, onKeyDown, ...attributes } = handle;

  return (
    <IconButton
      {...attributes}
      ref={ref}
      size="XS"
      variant="ghost"
      withTooltip={false}
      label={formatMessage(
        { id: getTranslationKey('list.item.reorder'), defaultMessage: 'Reorder {name}' },
        { name }
      )}
      {...REORDER_HANDLE_PROPS}
      // Not stopped: once a drag starts, the arrows and the drop key are read on
      // the document. The item ignores keys from here (`isFromReorderHandle`).
      onKeyDown={onKeyDown}
      // A click on the grip is not a click on the item.
      onClick={(event) => event.stopPropagation()}
    >
      <Drag />
    </IconButton>
  );
};
