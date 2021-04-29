import React from 'react';
import PropTypes from 'prop-types';

import ListItem from './ListItem';
import ListWrapper from './ListWrapper';

const sortOptions = {
  email_asc: 'email:ASC',
  email_desc: 'email:DESC',
  firstname_asc: 'firstname:ASC',
  firstname_desc: 'firstname:DESC',
  lastname_asc: 'lastname:ASC',
  lastname_desc: 'lastname:DESC',
  username_asc: 'username:ASC',
  username_desc: 'username:DESC',
};

const SortList = ({ onClick, selectedItem }) => {
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
