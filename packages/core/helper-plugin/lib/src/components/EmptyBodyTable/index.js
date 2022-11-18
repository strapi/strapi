import React from 'react';
import { Tbody, Tr, Td } from '@strapi/design-system/Table';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Loader } from '@strapi/design-system/Loader';
import PropTypes from 'prop-types';
import EmptyStateLayout from '../EmptyStateLayout';

const EmptyBodyTable = ({ colSpan, isLoading, ...rest }) => {
  if (isLoading) {
    return (
      <Tbody>
        <Tr>
          <Td colSpan={colSpan}>
            <Flex justifyContent="center">
              <Box padding={11} background="neutral0">
                <Loader>Loading content...</Loader>
              </Box>
            </Flex>
          </Td>
        </Tr>
      </Tbody>
    );
  }

  return (
    <Tbody>
      <Tr>
        <Td colSpan={colSpan}>
          <EmptyStateLayout {...rest} hasRadius={false} shadow="" />
        </Td>
      </Tr>
    </Tbody>
  );
};

EmptyBodyTable.defaultProps = {
  action: undefined,
  colSpan: 1,
  content: undefined,
  icon: undefined,
  isLoading: false,
};

EmptyBodyTable.propTypes = {
  action: PropTypes.any,
  colSpan: PropTypes.number,
  content: PropTypes.shape({
    id: PropTypes.string,
    defaultMessage: PropTypes.string,
    values: PropTypes.object,
  }),
  icon: PropTypes.oneOf(['document', 'media', 'permissions']),
  isLoading: PropTypes.bool,
};

export default EmptyBodyTable;
