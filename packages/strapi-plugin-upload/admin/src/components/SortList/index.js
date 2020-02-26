import React from 'react';
import PropTypes from 'prop-types';

import Wrapper from './Wrapper';
import SortListItem from '../SortListItem';

const SortList = ({ isShown, list, onClick, selectedItem }) => {
  return (
    <Wrapper isShown={isShown}>
      {Object.keys(list).map(item => {
        return (
          <SortListItem
            key={item}
            label={item}
            value={list[item]}
            onClick={onClick}
            selectedItem={selectedItem}
          />
        );
      })}
    </Wrapper>
  );
};

SortList.defaultProps = {
  list: {},
  isShown: false,
  onClick: () => {},
  selectedItem: null,
};

SortList.propTypes = {
  list: PropTypes.object,
  isShown: PropTypes.bool,
  onClick: PropTypes.func,
  selectedItem: PropTypes.string,
};

export default SortList;
