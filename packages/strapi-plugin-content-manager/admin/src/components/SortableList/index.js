import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { useLayoutDnd } from '../../contexts/LayoutDnd';

import Add from '../AddDropdown';
import SortWrapper from '../SortWrapper';
import Item from './Item';

const SortableList = ({
  addRelation,
  buttonData,
  moveRelation,
  removeRelation,
}) => {
  const { relationsLayout } = useLayoutDnd();

  return (
    <div className="col-4">
      <SortWrapper>
        {relationsLayout.map((relationName, index) => {
          //
          return (
            <Item
              index={index}
              key={relationName}
              move={moveRelation}
              name={relationName}
              removeRelation={removeRelation}
            />
          );
        })}
        <Add
          data={buttonData}
          onClick={addRelation}
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
  addRelation: PropTypes.func.isRequired,
  buttonData: PropTypes.array,
  moveRelation: PropTypes.func.isRequired,
  removeRelation: PropTypes.func.isRequired,
};

export default memo(SortableList);
