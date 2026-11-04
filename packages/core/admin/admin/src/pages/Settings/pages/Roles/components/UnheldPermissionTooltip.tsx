import * as React from 'react';

import { Box, Tooltip } from '@strapi/design-system';
import { useIntl } from 'react-intl';

interface UnheldPermissionTooltipProps {
  children: React.ReactNode;
  isFormDisabled?: boolean;
  userHasPermission: boolean;
}

/**
 * Explains why a permission checkbox is disabled when the current user does not hold that
 * permission themselves. A disabled checkbox does not fire pointer events and cannot be focused,
 * so the tooltip is attached to a focusable wrapper around it.
 */
const UnheldPermissionTooltip = ({
  children,
  isFormDisabled,
  userHasPermission,
}: UnheldPermissionTooltipProps) => {
  const { formatMessage } = useIntl();

  // Only explain the disabled state when the missing permission is the reason for it
  if (isFormDisabled || userHasPermission) {
    return <>{children}</>;
  }

  const label = formatMessage({
    id: 'Settings.permissions.cannot-grant-unheld',
    defaultMessage: "You can't grant a permission you don't have yourself",
  });

  // A disabled checkbox is skipped by the tab order, so the wrapper takes the focus instead: the
  // tooltip opens on focus and the label is announced by screen readers
  return (
    <Tooltip label={label}>
      <Box tag="span" display="inline-flex" tabIndex={0} role="group" aria-label={label}>
        {children}
      </Box>
    </Tooltip>
  );
};

export { UnheldPermissionTooltip };
