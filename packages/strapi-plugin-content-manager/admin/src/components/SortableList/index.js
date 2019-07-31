import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { useLayoutDnd } from '../../contexts/LayoutDnd';

import Add from '../AddDropdown';
import SortWrapper from '../SortWrapper';
import Item from './Item';

const SortableList = ({ addItem, buttonData, moveItem, removeItem }) => {
  const { relationsLayout } = useLayoutDnd();

  return (
    <div className="col-4">
      <SortWrapper>
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
          onClick={addItem}
          style={{
            marginLeft: 10,
            marginRight: 10,
            marginBottom: 10,
          }}
          pStyle={{ marginTop: '-2px' }}
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
