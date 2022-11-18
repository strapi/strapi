import React from 'react';
import PropTypes from 'prop-types';
import { Typography, Box, Flex, Icon } from '@strapi/design-system';
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
