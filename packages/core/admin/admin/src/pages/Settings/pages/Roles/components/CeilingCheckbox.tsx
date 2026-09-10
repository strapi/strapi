import * as React from 'react';

import { Checkbox, Tooltip } from '@strapi/design-system';
import { useIntl } from 'react-intl';

type CheckboxProps = React.ComponentProps<typeof Checkbox>;

interface CeilingCheckboxProps extends CheckboxProps {
  /**
   * The current admin does not hold this permission, so they cannot grant it.
   * The checkbox stays visible (the permission model is not hidden) but is
   * disabled and explains why on hover.
   */
  restricted?: boolean;
}

/**
 * A permission checkbox that explains itself when it is disabled by the
 * permission ceiling ("you can't grant what you don't hold", CMS-1718).
 */
const CeilingCheckbox = ({ restricted = false, ...props }: CeilingCheckboxProps) => {
  const { formatMessage } = useIntl();

  if (!restricted) {
    return <Checkbox {...props} />;
  }

  return (
    <Tooltip
      label={formatMessage({
        id: 'Settings.permissions.ceiling.tooltip',
        defaultMessage: "You can't grant this permission because you don't hold it yourself.",
      })}
    >
      {/* A disabled input emits no hover events: the span carries the tooltip. */}
      <span style={{ display: 'inline-flex' }}>
        <Checkbox {...props} disabled />
      </span>
    </Tooltip>
  );
};

export { CeilingCheckbox };
export type { CeilingCheckboxProps };
