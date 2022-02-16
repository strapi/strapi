import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Box } from '@strapi/design-system/Box';
import { Stack } from '@strapi/design-system/Stack';
import { Typography } from '@strapi/design-system/Typography';

const Logo = styled.img`
  display: block;
  width: 64px;
  height: 64px;
  object-fit: contain;
  border-radius: 6px;
`;

const PluginCard = ({ plugin }) => {
  const { id, attributes } = plugin;

  return (
    <Box padding={5} hasRadius background="neutral0" key={id} shadow="tableShadow">
      <Stack size={5}>
        <Logo src={attributes.logo.url} alt={`${attributes.name} logo`} />
        <Typography variant="delta">{attributes.name}</Typography>
        <Typography variant="omega">{attributes.description}</Typography>
      </Stack>
    </Box>
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
