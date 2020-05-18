import React from 'react';
import PropTypes from 'prop-types';

// import { getTrad } from '../../utils';

import StyledListItem from './StyledListItem';
// import IntlText from '../IntlText';

const ListItem = ({ onClick, selectedItem, label, value }) => {
  const handleClick = () => {
    onClick({ target: { name: '_sort', value } });
  };

  return (
    <StyledListItem isActive={selectedItem === value} onClick={handleClick}>
      {/* <IntlText id={getTrad(`sort.${label}`)} lineHeight="27px" /> */}
      <span>{label}</span>
    </StyledListItem>
  );
};

ListItem.defaultProps = {
  selectedItem: null,
  label: '',
  onClick: () => {},
  value: null,
};

ListItem.propTypes = {
  selectedItem: PropTypes.string,
  label: PropTypes.string,
  onClick: PropTypes.func,
  value: PropTypes.string,
};

export default ListItem;
