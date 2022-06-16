import React from 'react';
import PropTypes from 'prop-types';
import { Typography } from '@strapi/design-system/Typography';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Icon } from '@strapi/design-system/Icon';
import EmptyStateDocument from '@strapi/icons/EmptyDocuments';
import { EmptyNpmPackageGrid } from './EmptyNpmPackageGrid';

const EmptyNpmPackageSearch = ({ content }) => {
  return (
    <Box position="relative">
      <EmptyNpmPackageGrid />
      <Box position="absolute" top={11} width="100%">
        <Flex alignItems="center" justifyContent="center" direction="column">
          <Icon as={EmptyStateDocument} color="" width="160px" height="88px" />
          <Box paddingTop={6}>
            <Typography variant="delta" as="p" textColor="neutral600">
              {content}
            </Typography>
          </Box>
        </Flex>
      </Box>
    </Box>
  );
};

EmptyNpmPackageSearch.propTypes = {
  content: PropTypes.string.isRequired,
};

export default EmptyNpmPackageSearch;
