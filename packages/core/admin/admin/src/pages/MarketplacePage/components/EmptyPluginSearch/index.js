import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Typography } from '@strapi/design-system/Typography';
import { Stack } from '@strapi/design-system/Stack';
import { Box } from '@strapi/design-system/Box';
import { Icon } from '@strapi/design-system/Icon';
import EmptyStateDocument from '@strapi/icons/EmptyDocuments';
import { EmptyPluginGrid } from './EmptyPluginGrid';

const EnhancedStack = styled(Stack)`
  align-items: center;
`;

export const EmptyPluginSearch = ({ content }) => {
  return (
    <Box position="relative">
      <EmptyPluginGrid />
      <Box position="absolute" top={11} width="100%">
        <EnhancedStack size={4} textAlign="center">
          <EnhancedStack size={6}>
            <Icon as={EmptyStateDocument} color="" width="160px" height="88px" />
            <Typography variant="delta" as="p" textColor="neutral600">
              {content}
            </Typography>
          </EnhancedStack>
        </EnhancedStack>
      </Box>
    </Box>
  );
};

EmptyPluginSearch.propTypes = {
  content: PropTypes.string.isRequired,
};
