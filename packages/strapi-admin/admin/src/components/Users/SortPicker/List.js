import React from 'react';
import PropTypes from 'prop-types';

import ListItem from './ListItem';
import ListWrapper from './ListWrapper';

const SortList = ({ onClick, selectedItem }) => {
  const sortOptions = {
    name_asc: 'name:ASC',
    name_desc: 'name:DESC',
  };

  return (
    <ListWrapper>
      {Object.keys(sortOptions).map(item => {
        return (
          <ListItem
            key={item}
            label={item}
            value={sortOptions[item]}
            onClick={onClick}
            selectedItem={selectedItem}
          />
        );
      })}
    </ListWrapper>
  );
};

SortList.defaultProps = {
  onClick: () => {},
  selectedItem: null,
};

SortList.propTypes = {
  onClick: PropTypes.func,
  selectedItem: PropTypes.string,
};

export default SortList;
