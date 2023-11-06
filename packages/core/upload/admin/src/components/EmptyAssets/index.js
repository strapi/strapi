import React from 'react';

import { Box, Flex, Icon, Typography } from '@strapi/design-system';
import { EmptyDocuments } from '@strapi/icons';
import PropTypes from 'prop-types';

import { EmptyAssetGrid } from './EmptyAssetGrid';

export const EmptyAssets = ({ icon, content, action, size, count }) => {
  return (
    <Box position="relative">
      <EmptyAssetGrid size={size} count={count} />

      <Box position="absolute" top={11} width="100%">
        <Flex direction="column" alignItems="center" gap={4} textAlign="center">
          <Flex direction="column" alignItems="center" gap={6}>
            <Icon as={icon || EmptyDocuments} color="" width="160px" height="88px" />

            <Typography variant="delta" as="p" textColor="neutral600">
              {content}
            </Typography>
          </Flex>

          {action}
        </Flex>
      </Box>
    </Box>
  );
};

EmptyAssets.defaultProps = {
  action: undefined,
  icon: undefined,
  size: 'M',
  count: 12,
};

EmptyAssets.propTypes = {
  action: PropTypes.node,
  icon: PropTypes.func,
  content: PropTypes.string.isRequired,
  size: PropTypes.string,
  count: PropTypes.number,
};
