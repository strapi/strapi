import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';

import SortWrapper from '../SortWrapper';
import Item from './Item';

const FieldsReorder = ({ attributes, layout, moveItem, moveRow }) => {
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
          //
          return (
            <div key={row.rowId} style={{ display: 'flex' }}>
              {row.rowContent.map((rowContent, index) => {
                const { name, size } = rowContent;

                return (
                  <Item
                    itemIndex={index}
                    key={name}
                    moveRow={moveRow}
                    moveItem={moveItem}
                    name={name}
                    rowIndex={rowIndex}
                    size={size}
                    type={getType(name)}
                    //
                  />
                );
              })}
            </div>
          );
        })}
      </SortWrapper>
    </div>
  );
};

FieldsReorder.defaultProps = {
  attributes: {},
  layout: [],
};

FieldsReorder.propTypes = {
  attributes: PropTypes.object,
  layout: PropTypes.array,
  moveItem: PropTypes.func.isRequired,
  moveRow: PropTypes.func.isRequired,
};

export default memo(FieldsReorder);
