import { getTranslationKey } from './translations';

import type { IntlShape } from 'react-intl';

interface FormatMoveSuccessArgs {
  formatMessage: IntlShape['formatMessage'];
  count: number;
  /**
   * Leaf name of the folder the items came from, or `null` when the move spans
   * several source folders and no single one can be named — a global-search
   * selection can hold items from anywhere. The wording then omits the source
   * rather than naming one folder and implying the rest came from it too.
   */
  source: string | null;
  destination: string;
}

/**
 * Single source of truth for the bulk-move success wording. Both the DnD drop
 * and the BulkMoveDialog format the toast (and DnD live-region announcement)
 * through here so the two paths stay identical for the same move.
 */
export const formatMoveSuccessMessage = ({
  formatMessage,
  count,
  source,
  destination,
}: FormatMoveSuccessArgs): string => {
  if (source === null) {
    return formatMessage(
      {
        id: getTranslationKey('list.bulk-actions.move.success-multiple-sources'),
        defaultMessage:
          '{count, plural, =1 {# element has} other {# elements have}} been moved to {destination}',
      },
      { count, destination }
    );
  }

  return formatMessage(
    {
      id: getTranslationKey('list.bulk-actions.move.success'),
      defaultMessage:
        '{count, plural, =1 {# element has} other {# elements have}} been moved from {source} to {destination}',
    },
    { count, source, destination }
  );
};
