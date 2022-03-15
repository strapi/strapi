import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { Box } from '@strapi/design-system/Box';
import { Stack } from '@strapi/design-system/Stack';
import { Typography } from '@strapi/design-system/Typography';
import { Button } from '@strapi/design-system/Button';
import { LinkButton } from '@strapi/design-system/LinkButton';
import { Flex } from '@strapi/design-system/Flex';
import { Icon } from '@strapi/design-system/Icon';
import { Tooltip } from '@strapi/design-system/Tooltip';
import ExternalLink from '@strapi/icons/ExternalLink';
import Duplicate from '@strapi/icons/Duplicate';
import Check from '@strapi/icons/Check';
import CheckCircle from '@strapi/icons/CheckCircle';
import { useNotification, useTracking } from '@strapi/helper-plugin';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import madeByStrapiIcon from '../../../../assets/images/icon_made-by-strapi.svg';

// Custom component to have an ellipsis after the 2nd line
const EllipsisText = styled(Typography)`
  /* stylelint-disable value-no-vendor-prefix, property-no-vendor-prefix */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  /* stylelint-enable value-no-vendor-prefix, property-no-vendor-prefix */
  overflow: hidden;
`;

const PluginCard = ({ plugin, installedPluginNames, useYarn }) => {
  const { attributes } = plugin;
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const { trackUsage } = useTracking();

  const isInstalled = installedPluginNames.includes(attributes.npmPackageName);

  const commandToCopy = useYarn
    ? `yarn add ${attributes.npmPackageName}`
    : `npm install ${attributes.npmPackageName}`;

  const madeByStrapiMessage = formatMessage({
    id: 'admin.pages.MarketPlacePage.plugin.tooltip.madeByStrapi',
    defaultMessage: 'Made by Strapi',
  });

  return (
    <Flex
      direction="column"
      justifyContent="space-between"
      paddingTop={4}
      paddingRight={6}
      paddingBottom={4}
      paddingLeft={6}
      hasRadius
      background="neutral0"
      shadow="tableShadow"
      height="100%"
      alignItems="normal"
    >
      <Box>
        <Box
          as="img"
          src={attributes.logo.url}
          alt={`${attributes.name} logo`}
          hasRadius
          width={11}
          height={11}
        />
        <Box paddingTop={4}>
          <Typography as="h3" variant="delta">
            <Flex alignItems="center">
              {attributes.name}
              {attributes.validated && !attributes.madeByStrapi && (
                <Tooltip
                  description={formatMessage({
                    id: 'admin.pages.MarketPlacePage.plugin.tooltip.verified',
                    defaultMessage: 'Plugin verified by Strapi',
                  })}
                >
                  <Flex>
                    <Icon as={CheckCircle} marginLeft={2} color="success600" />
                  </Flex>
                </Tooltip>
              )}
              {attributes.madeByStrapi && (
                <Tooltip description={madeByStrapiMessage}>
                  <Flex>
                    <Box
                      as="img"
                      src={madeByStrapiIcon}
                      alt={madeByStrapiMessage}
                      marginLeft={1}
                      width={6}
                      height="auto"
                    />
                  </Flex>
                </Tooltip>
              )}
            </Flex>
          </Typography>
        </Box>
        <Box paddingTop={2}>
          <EllipsisText as="p" variant="omega" textColor="neutral600">
            {attributes.description}
          </EllipsisText>
        </Box>
      </Box>

      <Stack horizontal spacing={2} style={{ alignSelf: 'flex-end' }} paddingTop={6}>
        <LinkButton
          size="S"
          href={`https://market.strapi.io/plugins/${attributes.slug}`}
          endIcon={<ExternalLink />}
          aria-label={formatMessage(
            {
              id: 'admin.pages.MarketPlacePage.plugin.info.label',
              defaultMessage: 'Learn more about {pluginName}',
            },
            { pluginName: attributes.name }
          )}
          variant="tertiary"
          onClick={() => trackUsage('didPluginLearnMore')}
        >
          {formatMessage({
            id: 'admin.pages.MarketPlacePage.plugin.info.text',
            defaultMessage: 'Learn more',
          })}
        </LinkButton>
        {isInstalled ? (
          <Box paddingLeft={4}>
            <Icon as={Check} marginRight={2} width={12} height={12} color="success600" />
            <Typography variant="omega" textColor="success600" fontWeight="bold">
              {formatMessage({
                id: 'admin.pages.MarketPlacePage.plugin.installed',
                defaultMessage: 'Installed',
              })}
            </Typography>
          </Box>
        ) : (
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
        )}
      </Stack>
    </Flex>
  );
};

PluginCard.propTypes = {
  plugin: PropTypes.shape({
    id: PropTypes.string.isRequired,
    attributes: PropTypes.shape({
      name: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      slug: PropTypes.string.isRequired,
      npmPackageName: PropTypes.string.isRequired,
      npmPackageUrl: PropTypes.string.isRequired,
      repositoryUrl: PropTypes.string.isRequired,
      logo: PropTypes.object.isRequired,
      developerName: PropTypes.string.isRequired,
      validated: PropTypes.bool.isRequired,
      madeByStrapi: PropTypes.bool.isRequired,
      strapiCompatibility: PropTypes.oneOf(['v3', 'v4']).isRequired,
    }).isRequired,
  }).isRequired,
  installedPluginNames: PropTypes.arrayOf(PropTypes.string).isRequired,
  useYarn: PropTypes.bool.isRequired,
};

export default PluginCard;
