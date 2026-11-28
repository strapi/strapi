import * as React from 'react';

import { Alert, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTranslation } from '../../../utils/getTranslation';

import type { SelfWritableField } from '../../../../../shared/contracts/conditions';

interface SelfWritableAlertProps {
  /** The values the condition reads that a signed-in user can write themselves */
  fields: SelfWritableField[];
  /** A button for the alert, such as the way back to the list */
  action?: React.ReactNode;
}

/**
 * Says which values a condition trusts that the users it judges can change themselves, and under
 * which roles, so an author does not rely on them for access.
 */
const SelfWritableAlert = ({ fields, action }: SelfWritableAlertProps) => {
  const { formatMessage } = useIntl();

  if (fields.length === 0) {
    return null;
  }

  return (
    <Alert
      variant="warning"
      closeLabel={formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
      action={action}
    >
      <Typography tag="span" display="block" fontWeight="bold">
        {formatMessage({
          id: getTranslation('conditions.self-writable.title'),
          defaultMessage: 'Users can change these values themselves:',
        })}
      </Typography>
      {fields.map(({ field, roles }) => (
        <Typography key={field} tag="span" display="block">
          {formatMessage(
            {
              id: getTranslation('conditions.self-writable.field'),
              defaultMessage: '{field} ({roles})',
            },
            { field, roles: roles.join(', ') }
          )}
        </Typography>
      ))}
    </Alert>
  );
};

export { SelfWritableAlert };
