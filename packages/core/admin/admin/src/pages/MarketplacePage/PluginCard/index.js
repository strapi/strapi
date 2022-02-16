import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { Box } from '@strapi/design-system/Box';
import { Stack } from '@strapi/design-system/Stack';
import { Typography } from '@strapi/design-system/Typography';
import { Button } from '@strapi/design-system/Button';
import { LinkButton } from '@strapi/design-system/LinkButton';
import { Flex } from '@strapi/design-system/Flex';
import ExternalLink from '@strapi/icons/ExternalLink';
import Duplicate from '@strapi/icons/Duplicate';

const Wrapper = styled(Box)`
  .logo {
    display: block;
    width: 64px;
    height: 64px;
    object-fit: contain;
    border-radius: 6px;
  }

  .name {
    display: block;
    margin-top: ${({ theme }) => theme.spaces[5]};
  }

  .description {
    margin-top: ${({ theme }) => theme.spaces[3]};
    /* eslint-disable */
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    /* eslint-enable */
    overflow: hidden;
  }
`;

const PluginCard = ({ plugin }) => {
  const { id, attributes } = plugin;
  const { formatMessage } = useIntl();

  return (
    <Wrapper padding={5} hasRadius background="neutral0" key={id} shadow="tableShadow">
      <Flex
        justifyContent="space-between"
        direction="column"
        alignItems="flex-end"
        style={{ height: '100%' }}
      >
        <div style={{ width: '100%' }}>
          <img className="logo" src={attributes.logo.url} alt={`${attributes.name} logo`} />
          <Typography variant="delta" className="name">
            {attributes.name}
          </Typography>
          <Typography variant="omega" className="description" textColor="neutral600">
            {attributes.description}
          </Typography>
        </div>
        <Stack horizontal size={2} paddingTop={3}>
          <LinkButton
            size="S"
            href={`https://market.strapi.io/plugins/${attributes.slug}`}
            endIcon={<ExternalLink />}
            variant="tertiary"
          >
            {formatMessage({
              id: 'admin.pages.MarketPlacePage.plugin.info',
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
    </Wrapper>
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
