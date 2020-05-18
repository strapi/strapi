import React from 'react';
import PropTypes from 'prop-types';
import { Text } from '@buffetjs/core';
import { useIntl } from 'react-intl';
import StyledListItem from './StyledListItem';

const ListItem = ({ onClick, selectedItem, label, value }) => {
  const { formatMessage } = useIntl();

  const handleClick = () => {
    onClick({ target: { name: '_sort', value } });
  };

  return (
    <StyledListItem isActive={selectedItem === value} onClick={handleClick}>
      <Text lineHeight="27px">
        {formatMessage({ id: `app.components.Users.SortPicker.sortby.${label}` })}
      </Text>
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
