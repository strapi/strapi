import React, { memo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { isEmpty } from 'lodash';
import { useDrop } from 'react-dnd';
import Select, { createFilter } from 'react-select';
import ItemTypes from '../../utils/ItemTypes';
import { ListShadow, ListWrapper } from './components';
import ListItem from './ListItem';

function SelectMany({
  addRelation,
  components,
  displayNavigationLink,
  mainField,
  name,
  isDisabled,
  isLoading,
  move,
  onInputChange,
  onMenuClose,
  onMenuOpen,
  onMenuScrollToBottom,
  onRemove,
  options,
  placeholder,
  styles,
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

  const filterConfig = {
    ignoreCase: true,
    ignoreAccents: true,
    trim: false,
    matchFrom: 'any',
  };

  return (
    <>
      <Select
        components={components}
        isDisabled={isDisabled}
        id={name}
        filterOption={(candidate, input) => {
          if (!isEmpty(value)) {
            const isSelected = value.findIndex(item => item.id === candidate.value.id) !== -1;

            if (isSelected) {
              return false;
            }
          }

          if (input) {
            return createFilter(filterConfig)(candidate, input);
          }

          return true;
        }}
        mainField={mainField}
        isLoading={isLoading}
        isMulti
        isSearchable
        options={options}
        onChange={addRelation}
        onInputChange={onInputChange}
        onMenuClose={onMenuClose}
        onMenuOpen={onMenuOpen}
        onMenuScrollToBottom={onMenuScrollToBottom}
        placeholder={placeholder}
        styles={styles}
        value={[]}
      />

      <ListWrapper ref={drop}>
        {!isEmpty(value) && (
          <ul>
            {value.map((data, index) => (
              <ListItem
                key={data.id}
                data={data}
                displayNavigationLink={displayNavigationLink}
                isDisabled={isDisabled}
                findRelation={findRelation}
                mainField={mainField}
                moveRelation={moveRelation}
                onRemove={() => {
                  if (!isDisabled) {
                    onRemove(`${name}.${index}`);
                  }
                }}
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
  components: {},
  move: () => {},
  value: null,
};

SelectMany.propTypes = {
  addRelation: PropTypes.func.isRequired,
  components: PropTypes.object,
  displayNavigationLink: PropTypes.bool.isRequired,
  isDisabled: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  mainField: PropTypes.shape({
    name: PropTypes.string.isRequired,
    schema: PropTypes.shape({
      type: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
  move: PropTypes.func,
  name: PropTypes.string.isRequired,
  onInputChange: PropTypes.func.isRequired,
  onMenuClose: PropTypes.func.isRequired,
  onMenuOpen: PropTypes.func.isRequired,
  onMenuScrollToBottom: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  options: PropTypes.array.isRequired,
  placeholder: PropTypes.node.isRequired,
  styles: PropTypes.object.isRequired,
  targetModel: PropTypes.string.isRequired,
  value: PropTypes.array,
};

export default memo(SelectMany);
