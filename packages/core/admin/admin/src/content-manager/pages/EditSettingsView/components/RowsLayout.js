import React from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@strapi/design-system/Grid';
import RowItemsLayout from './RowItemsLayout';

const RowsLayout = ({ row, onRemoveField, rowIndex }) => {
  return (
    <Grid gap={4}>
      {row.rowContent.map((rowItem, index) => {
        return (
          <RowItemsLayout
            key={rowItem.name}
            rowItem={rowItem}
            index={index}
            rowId={row.rowId}
            onRemoveField={onRemoveField}
            rowIndex={rowIndex}
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
