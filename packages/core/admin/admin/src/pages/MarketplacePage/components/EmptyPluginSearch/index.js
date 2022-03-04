import React from 'react';
import PropTypes from 'prop-types';
import { Typography } from '@strapi/design-system/Typography';
import { Stack } from '@strapi/design-system/Stack';
import { Box } from '@strapi/design-system/Box';
import { Icon } from '@strapi/design-system/Icon';
import EmptyStateDocument from '@strapi/icons/EmptyDocuments';
import { EmptyPluginGrid } from './EmptyPluginGrid';

export const EmptyPluginSearch = ({ content }) => {
  return (
    <Box position="relative">
      <EmptyPluginGrid />
      <Box position="absolute" top={11} width="100%">
        <Stack style={{ alignItems: 'center' }} size={4} textAlign="center">
          <Stack style={{ alignItems: 'center' }} size={6}>
            <Icon as={EmptyStateDocument} color="" width="160px" height="88px" />
            <Typography variant="delta" as="p" textColor="neutral600">
              {content}
            </Typography>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
};

EmptyPluginSearch.propTypes = {
  content: PropTypes.string.isRequired,
};
