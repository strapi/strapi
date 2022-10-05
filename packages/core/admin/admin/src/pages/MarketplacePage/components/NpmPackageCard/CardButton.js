import React from 'react';
import semver from 'semver';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Tooltip } from '@strapi/design-system/Tooltip';
import { Button } from '@strapi/design-system/Button';
import { Box } from '@strapi/design-system/Box';
import Duplicate from '@strapi/icons/Duplicate';

const TooltipButton = ({ description, installMessage, disabled, handleCopy, pluginName }) => (
  <Tooltip data-testid={`tooltip-${pluginName}`} description={description}>
    <Box>
      <Button
        size="S"
        startIcon={<Duplicate />}
        variant="secondary"
        disabled={disabled}
        onClick={handleCopy}
      >
        {installMessage}
      </Button>
    </Box>
  </Tooltip>
);

const CardButton = ({ strapiPeerDepVersion, strapiAppVersion, handleCopy, pluginName }) => {
  const { formatMessage } = useIntl();
  const versionRange = semver.validRange(strapiPeerDepVersion);
  const isCompatible = semver.satisfies(strapiAppVersion, versionRange);

  const installMessage = formatMessage({
    id: 'admin.pages.MarketPlacePage.plugin.copy',
    defaultMessage: 'Copy install command',
  });

  // Only plugins receive a strapiAppVersion
  if (strapiAppVersion) {
    if (!versionRange) {
      return (
        <TooltipButton
          installMessage={installMessage}
          pluginName={pluginName}
          description={formatMessage(
            {
              id: 'admin.pages.MarketPlacePage.plugin.version.null',
              defaultMessage:
                'Unable to verify compatibility with your Strapi version: "{strapiAppVersion}"',
            },
            { strapiAppVersion }
          )}
          handleCopy={handleCopy}
        />
      );
    }

    if (!isCompatible) {
      return (
        <TooltipButton
          installMessage={installMessage}
          pluginName={pluginName}
          description={formatMessage(
            {
              id: 'admin.pages.MarketPlacePage.plugin.version',
              defaultMessage:
                'Update your Strapi version: "{strapiAppVersion}" to: "{versionRange}"',
            },
            {
              strapiAppVersion,
              versionRange,
            }
          )}
          disabled
        />
      );
    }
  }

  return (
    <Button size="S" startIcon={<Duplicate />} variant="secondary" onClick={handleCopy}>
      {installMessage}
    </Button>
  );
};

TooltipButton.defaultProps = {
  disabled: false,
  handleCopy: null,
};

TooltipButton.propTypes = {
  description: PropTypes.string.isRequired,
  installMessage: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  handleCopy: PropTypes.func,
  pluginName: PropTypes.string.isRequired,
};

CardButton.defaultProps = {
  strapiAppVersion: null,
  strapiPeerDepVersion: null,
};

CardButton.propTypes = {
  strapiAppVersion: PropTypes.string,
  strapiPeerDepVersion: PropTypes.string,
  handleCopy: PropTypes.func.isRequired,
  pluginName: PropTypes.string.isRequired,
};

export default CardButton;
