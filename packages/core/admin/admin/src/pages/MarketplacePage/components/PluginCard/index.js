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
import ExternalLink from '@strapi/icons/ExternalLink';
import Duplicate from '@strapi/icons/Duplicate';

// Custom component to have an ellipsis after the 2nd line
const EllipsisText = styled(Typography)`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
`;

const PluginCard = ({ plugin }) => {
  const { attributes } = plugin;
  const { formatMessage } = useIntl();

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
        <Box paddingTop={5}>
          <Typography as="h3" variant="delta">
            {attributes.name}
          </Typography>
        </Box>
        <Box paddingTop={2}>
          <EllipsisText as="p" variant="omega" textColor="neutral600">
            {attributes.description}
          </EllipsisText>
        </Box>
      </Box>

      <Stack horizontal size={2} style={{ alignSelf: 'flex-end' }} paddingTop={3}>
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
        <Button size="S" endIcon={<Duplicate />} variant="secondary">
          {formatMessage({
            id: 'admin.pages.MarketPlacePage.plugin.copy',
            defaultMessage: 'Copy install command',
          })}
        </Button>
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
};

export default PluginCard;
