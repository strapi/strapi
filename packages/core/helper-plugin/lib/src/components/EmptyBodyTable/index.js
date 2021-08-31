import React from 'react';
import { Tbody, Tr, Td } from '@strapi/parts/Table';
import EmptyStateLayout from '../EmptyStateLayout';
import PropTypes from 'prop-types';

const EmptyBodyTable = ({ colSpan, ...rest }) => {
  return (
    <Tbody>
      <Tr>
        <Td colSpan={colSpan}>
          <EmptyStateLayout {...rest} />
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
};

export default EmptyBodyTable;
