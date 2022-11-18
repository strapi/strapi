import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { useNotification, useTracking } from '@strapi/helper-plugin';
import { Box, Icon, Typography } from '@strapi/design-system';
import Check from '@strapi/icons/Check';
import CardButton from './CardButton';

const InstallPluginButton = ({
  isInstalled,
  isInDevelopmentMode,
  commandToCopy,
  strapiAppVersion,
  strapiPeerDepVersion,
  pluginName,
}) => {
  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();

  const handleCopy = () => {
    navigator.clipboard.writeText(commandToCopy);
    trackUsage('willInstallPlugin');
    toggleNotification({
      type: 'success',
      message: { id: 'admin.pages.MarketPlacePage.plugin.copy.success' },
    });
  };

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
      <CardButton
        strapiAppVersion={strapiAppVersion}
        strapiPeerDepVersion={strapiPeerDepVersion}
        handleCopy={handleCopy}
        pluginName={pluginName}
      />
    );
  }

  // Not in development and plugin not installed already. Show nothing
  return null;
};

InstallPluginButton.defaultProps = {
  strapiAppVersion: null,
  strapiPeerDepVersion: null,
};

InstallPluginButton.propTypes = {
  isInstalled: PropTypes.bool.isRequired,
  isInDevelopmentMode: PropTypes.bool.isRequired,
  commandToCopy: PropTypes.string.isRequired,
  strapiAppVersion: PropTypes.string,
  strapiPeerDepVersion: PropTypes.string,
  pluginName: PropTypes.string.isRequired,
};

export default InstallPluginButton;
