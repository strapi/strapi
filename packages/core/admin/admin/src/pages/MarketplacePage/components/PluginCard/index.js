import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Box } from '@strapi/design-system/Box';
import { Stack } from '@strapi/design-system/Stack';
import { Typography } from '@strapi/design-system/Typography';
import { Button } from '@strapi/design-system/Button';
import { LinkButton } from '@strapi/design-system/LinkButton';
import { Flex } from '@strapi/design-system/Flex';
import { Icon } from '@strapi/design-system/Icon';
import ExternalLink from '@strapi/icons/ExternalLink';
import Duplicate from '@strapi/icons/Duplicate';
import Check from '@strapi/icons/Check';

const PluginCard = ({ plugin, installedPlugins }) => {
  const { attributes } = plugin;
  const { formatMessage } = useIntl();

  const isInstalled = installedPlugins.includes(attributes.name.toLowerCase());

  return (
    <Flex
      paddingLeft={6}
      paddingRight={6}
      paddingTop={4}
      paddingBottom={4}
      hasRadius
      background="neutral0"
      shadow="tableShadow"
      justifyContent="space-between"
      direction="column"
      alignItems="stretch"
      style={{ height: '100%' }}
    >
      <div>
        <Box
          as="img"
          src={attributes.logo.url}
          alt={`${attributes.name} logo`}
          hasRadius
          style={{
            width: '64px',
            height: '64px',
            objectFit: 'contain',
          }}
        />
        <Stack paddingTop={5} size={3}>
          <Typography as="h3" variant="delta">
            {attributes.name}
          </Typography>
          <Typography
            as="p"
            variant="omega"
            textColor="neutral600"
            style={{
              display: ' -webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
              overflow: 'hidden',
            }}
          >
            {attributes.description}
          </Typography>
        </Stack>
      </div>
      <Stack horizontal size={2} paddingTop={3} style={{ alignSelf: 'flex-end' }}>
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
          <Button size="S" endIcon={<Duplicate />} variant="secondary">
            {formatMessage({
              id: 'admin.pages.MarketPlacePage.plugin.copy',
              defaultMessage: 'Copy install command',
            })}
          </Button>
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
      strapiCompatibility: PropTypes.oneOf(['v3', 'v4']).isRequired,
    }).isRequired,
  }).isRequired,
  installedPlugins: PropTypes.array.isRequired,
};

export default PluginCard;
