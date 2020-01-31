import React, { memo } from 'react';
import PropTypes from 'prop-types';
import useLayoutDnd from '../../hooks/useLayoutDnd';

import Add from '../AddDropdown';
import SortWrapper from '../SortWrapper';
import Item from './Item';

const SortableList = ({ addItem, buttonData, moveItem, removeItem }) => {
  const { relationsLayout } = useLayoutDnd();

  return (
    <div className="col-4">
      <SortWrapper
        style={{
          marginTop: 7,
          paddingTop: 11,
          paddingLeft: 5,
          paddingRight: 5,
          border: '1px dashed #e3e9f3',
        }}
      >
        {relationsLayout.map((relationName, index) => {
          return (
            <Item
              index={index}
              key={relationName}
              move={moveItem}
              name={relationName}
              removeItem={removeItem}
            />
          );
        })}
        <Add
          data={buttonData}
          isRelation
          onClick={addItem}
          style={{
            marginLeft: 10,
            marginRight: 10,
            marginBottom: 13,
          }}
        />
      </SortWrapper>
    </div>
  );
};

SortableList.defaultProps = {
  buttonData: [],
};

SortableList.propTypes = {
  addItem: PropTypes.func.isRequired,
  buttonData: PropTypes.array,
  moveItem: PropTypes.func.isRequired,
  removeItem: PropTypes.func.isRequired,
};

export default memo(SortableList);
