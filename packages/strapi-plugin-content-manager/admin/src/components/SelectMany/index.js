import React, { memo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { isEmpty } from 'lodash';
import { useDrop } from 'react-dnd';

import Select from 'react-select';
import ItemTypes from '../../utils/itemsTypes';

import { ListShadow, ListWrapper } from './components';
import ListItem from './ListItem';

function SelectMany({
  addRelation,
  mainField,
  name,
  isLoading,
  move,
  nextSearch,
  onInputChange,
  onMenuClose,
  onMenuScrollToBottom,
  onRemove,
  options,
  placeholder,
  targetModel,
  value,
}) {
  const [, drop] = useDrop({ accept: ItemTypes.RELATION });
  const findRelation = id => {
    const relation = value.filter(c => {
      return `${c.id}` === `${id}`;
    })[0];

    return {
      relation,
      index: value.indexOf(relation),
    };
  };

  const moveRelation = useCallback(
    (id, atIndex) => {
      const { index } = findRelation(id);

      move(index, atIndex, name);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value]
  );

  return (
    <>
      <Select
        id={name}
        filterOption={el => {
          if (isEmpty(value)) {
            return true;
          }

          return value.findIndex(obj => obj.id === el.value.id) === -1;
        }}
        isLoading={isLoading}
        isMulti
        isSearchable
        options={options}
        onChange={addRelation}
        onInputChange={onInputChange}
        onMenuClose={onMenuClose}
        onMenuScrollToBottom={onMenuScrollToBottom}
        placeholder={placeholder}
        value={[]}
      />

      <ListWrapper ref={drop}>
        {!isEmpty(value) && (
          <ul>
            {value.map((data, index) => (
              <ListItem
                key={data.id}
                data={data}
                findRelation={findRelation}
                mainField={mainField}
                moveRelation={moveRelation}
                nextSearch={nextSearch}
                onRemove={() => onRemove(`${name}.${index}`)}
                targetModel={targetModel}
              />
            ))}
          </ul>
        )}
        {!isEmpty(value) && value.length > 4 && <ListShadow />}
      </ListWrapper>
    </>
  );
}

SelectMany.defaultProps = {
  move: () => {},
  value: null,
};

SelectMany.propTypes = {
  addRelation: PropTypes.func.isRequired,
  mainField: PropTypes.string.isRequired,
  move: PropTypes.func,
  name: PropTypes.string.isRequired,
  nextSearch: PropTypes.string.isRequired,
  isLoading: PropTypes.bool.isRequired,
  onInputChange: PropTypes.func.isRequired,
  onMenuClose: PropTypes.func.isRequired,
  onMenuScrollToBottom: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  options: PropTypes.array.isRequired,
  placeholder: PropTypes.node.isRequired,
  targetModel: PropTypes.string.isRequired,
  value: PropTypes.array,
};

export default memo(SelectMany);
