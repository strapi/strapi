import React from 'react';
import PropTypes from 'prop-types';
import { CommandItem, useCommandState } from 'cmdk';

const Item = ({ children, onSelect, displayOnSearchOnly, ...restProps }) => {
  const search = useCommandState((state) => state.search);

  if (!search && displayOnSearchOnly) {
    return null;
  }

  return (
    <CommandItem onSelect={onSelect} {...restProps}>
      {children}
    </CommandItem>
  );
};

Item.propTypes = {
  children: PropTypes.node.isRequired,
  onSelect: PropTypes.func,
  displayOnSearchOnly: PropTypes.bool,
};

Item.defaultProps = {
  onSelect() {},
  displayOnSearchOnly: false,
};

export default Item;
