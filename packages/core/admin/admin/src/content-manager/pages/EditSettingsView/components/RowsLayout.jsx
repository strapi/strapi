import React from 'react';

import { Grid } from '@strapi/design-system';
import PropTypes from 'prop-types';

import RowItemsLayout from './RowItemsLayout';

const RowsLayout = ({ row, onRemoveField, rowIndex }) => {
  return (
    <Grid>
      {row.rowContent.map((rowItem, index) => {
        return (
          <RowItemsLayout
            key={rowItem.name}
            rowItem={rowItem}
            index={index}
            rowId={row.rowId}
            onRemoveField={onRemoveField}
            rowIndex={rowIndex}
            lastIndex={row.rowContent.length - 1}
          />
        );
      })}
    </Grid>
  );
};

RowsLayout.propTypes = {
  onRemoveField: PropTypes.func.isRequired,
  row: PropTypes.object.isRequired,
  rowIndex: PropTypes.number.isRequired,
};

export default RowsLayout;
