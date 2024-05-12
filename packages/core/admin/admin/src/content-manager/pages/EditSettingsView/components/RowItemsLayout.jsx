import React from 'react';

import get from 'lodash/get';
import PropTypes from 'prop-types';

import { useLayoutDnd } from '../hooks/useLayoutDnd';

import DisplayedFieldButton from './DisplayedFieldButton';

const RowItemsLayout = ({ rowItem, onRemoveField, rowId, rowIndex, index, lastIndex }) => {
  const { setEditFieldToSelect, attributes, modifiedData, moveRow, moveItem } = useLayoutDnd();
  const attribute = get(attributes, [rowItem.name], {});
  const attributeLabel = get(modifiedData, ['metadatas', rowItem.name, 'edit', 'label'], '');

  return (
    <DisplayedFieldButton
      onEditField={() => setEditFieldToSelect(rowItem.name)}
      onDeleteField={() => onRemoveField(rowId, index)}
      attribute={attribute}
      index={index}
      lastIndex={lastIndex}
      rowIndex={rowIndex}
      name={rowItem.name}
      size={rowItem.size}
      moveRow={moveRow}
      moveItem={moveItem}
    >
      {attributeLabel || rowItem.name}
    </DisplayedFieldButton>
  );
};

RowItemsLayout.propTypes = {
  index: PropTypes.number.isRequired,
  lastIndex: PropTypes.number.isRequired,
  onRemoveField: PropTypes.func.isRequired,
  rowId: PropTypes.number.isRequired,
  rowIndex: PropTypes.number.isRequired,
  rowItem: PropTypes.object.isRequired,
};

export default RowItemsLayout;
