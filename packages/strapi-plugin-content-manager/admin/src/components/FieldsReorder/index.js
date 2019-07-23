import React, { memo } from 'react';

import { get } from 'lodash';

import { useLayoutDnd } from '../../contexts/LayoutDnd';

import Add from '../AddDropdown';
import SortWrapper from '../SortWrapper';
import { Wrapper } from './components';
import Item from './Item';

const FieldsReorder = () => {
  const {
    attributes,
    buttonData,
    layout,
    moveItem,
    moveRow,
    onAddData,
    removeField,
  } = useLayoutDnd();
  const getType = attributeName => {
    const attribute = get(attributes, [attributeName], {});

    if (attribute.plugin === 'upload') {
      return 'file';
    }

    return attribute.type;
  };

  return (
    <div className="col-8">
      <SortWrapper>
        {layout.map((row, rowIndex) => {
          return (
            <Wrapper key={row.rowId} style={{}}>
              {row.rowContent.map((rowContent, index) => {
                const { name, size } = rowContent;

                return (
                  <Item
                    itemIndex={index}
                    key={name}
                    moveRow={moveRow}
                    moveItem={moveItem}
                    name={name}
                    removeField={removeField}
                    rowIndex={rowIndex}
                    size={size}
                    type={getType(name)}
                  />
                );
              })}
            </Wrapper>
          );
        })}
        <Wrapper>
          <Add
            data={buttonData}
            onClick={onAddData}
            style={{ width: '100%', margin: '0 10px' }}
            pStyle={{ marginTop: '-2px' }}
          />
        </Wrapper>
      </SortWrapper>
    </div>
  );
};

export default memo(FieldsReorder);
