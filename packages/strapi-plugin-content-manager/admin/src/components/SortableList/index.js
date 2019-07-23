import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { useLayoutDnd } from '../../contexts/LayoutDnd';

import Add from '../AddDropdown';
import SortWrapper from '../SortWrapper';
import Item from './Item';

const SortableList = ({ moveRelation }) => {
  const { relationsLayout } = useLayoutDnd();

  return (
    <div className="col-4">
      <SortWrapper>
        {relationsLayout.map((relationName, index) => {
          //
          return (
            <Item
              index={index}
              move={moveRelation}
              name={relationName}
              key={relationName}
            />
          );
        })}
        <Add
          data={[]}
          onClick={() => {}}
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

SortableList.propTypes = {
  moveRelation: PropTypes.func.isRequired,
};

export default memo(SortableList);
