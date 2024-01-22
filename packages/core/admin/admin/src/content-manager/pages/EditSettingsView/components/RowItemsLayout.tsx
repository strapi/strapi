import get from 'lodash/get';

import { useLayoutDnd } from '../hooks/useLayoutDnd';

import { DisplayedFieldButton } from './DisplayedFieldButton';

interface RowItemsLayoutProps {
  index: number;
  lastIndex: number;
  onRemoveField: (rowIndex: number, index: number) => void;
  rowId: number;
  rowIndex: number;
  rowItem: {
    name: string;
    size: number;
  };
}

const RowItemsLayout = ({
  rowItem,
  onRemoveField,
  rowId,
  rowIndex,
  index,
  lastIndex,
}: RowItemsLayoutProps) => {
  const { setEditFieldToSelect, attributes, modifiedData, moveRow, moveItem } = useLayoutDnd();
  const attribute = get(attributes, [rowItem.name]);
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

export { RowItemsLayout };
