import { getTranslationKey } from './translations';

import type { IntlShape } from 'react-intl';

interface FormatMoveSuccessArgs {
  formatMessage: IntlShape['formatMessage'];
  count: number;
  source: string;
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
}: FormatMoveSuccessArgs): string =>
  formatMessage(
    {
      id: getTranslationKey('list.bulk-actions.move.success'),
      defaultMessage:
        '{count, plural, =1 {# element has} other {# elements have}} been moved from {source} to {destination}',
    },
    { count, source, destination }
  );
