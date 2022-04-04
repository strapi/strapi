import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { useNotification, useTracking } from '@strapi/helper-plugin';
import { Box } from '@strapi/design-system/Box';
import { Icon } from '@strapi/design-system/Icon';
import { Typography } from '@strapi/design-system/Typography';
import Check from '@strapi/icons/Check';
import Duplicate from '@strapi/icons/Duplicate';
import { Button } from '@strapi/design-system/Button';

const InstallPluginButton = ({ isInstalled, isInDevelopmentMode, commandToCopy }) => {
  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();

  // Already installed
  if (isInstalled) {
    return (
      <Box paddingLeft={4}>
        <Icon as={Check} marginRight={2} width={12} height={12} color="success600" />
        <Typography variant="omega" textColor="success600" fontWeight="bold">
          {formatMessage({
            id: 'admin.pages.MarketPlacePage.plugin.installed',
            defaultMessage: 'Installed',
          })}
        </Typography>
      </Box>
    );
  }

  // In development, show install button
  if (isInDevelopmentMode) {
    return (
      <CopyToClipboard
        onCopy={() => {
          trackUsage('willInstallPlugin');
          toggleNotification({
            type: 'success',
            message: { id: 'admin.pages.MarketPlacePage.plugin.copy.success' },
          });
        }}
        text={commandToCopy}
      >
        <Button size="S" startIcon={<Duplicate />} variant="secondary">
          {formatMessage({
            id: 'admin.pages.MarketPlacePage.plugin.copy',
            defaultMessage: 'Copy install command',
          })}
        </Button>
      </CopyToClipboard>
    );
  }

  // Not in development and plugin not installed already. Show nothing
  return null;
};

InstallPluginButton.propTypes = {
  isInstalled: PropTypes.bool.isRequired,
  isInDevelopmentMode: PropTypes.bool.isRequired,
  commandToCopy: PropTypes.string.isRequired,
};

export default InstallPluginButton;
