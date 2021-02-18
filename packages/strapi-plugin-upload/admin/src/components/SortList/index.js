import React from 'react';
import PropTypes from 'prop-types';

import Wrapper from './Wrapper';
import SortListItem from '../SortListItem';

const SortList = ({ list, onClick, selectedItem }) => {
  return (
    <Wrapper>
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
  onClick: () => {},
  selectedItem: null,
};

SortList.propTypes = {
  list: PropTypes.object,
  onClick: PropTypes.func,
  selectedItem: PropTypes.string,
};

export default SortList;
