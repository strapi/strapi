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
 * permission themselves. A disabled checkbox does not fire pointer events, so the tooltip is
 * attached to a wrapper around it.
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

  return (
    <Tooltip
      label={formatMessage({
        id: 'Settings.permissions.cannot-grant-unheld',
        defaultMessage: "You can't grant a permission you don't have yourself",
      })}
    >
      <Box tag="span" display="inline-flex">
        {children}
      </Box>
    </Tooltip>
  );
};

export { UnheldPermissionTooltip };
