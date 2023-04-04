import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { CommandItem, useCommandState } from 'cmdk';

const Shortcut = styled.kbd`
  font-size: 12px;
  min-width: 20px;
  padding: 4px;
  height: 20px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-transform: uppercase;
`;

const Item = ({ children, shortcut, onSelect, displayOnSearchOnly, ...rest }) => {
  const search = useCommandState((state) => state.search);

  if (!search && displayOnSearchOnly) {
    return null;
  }

  return (
    <CommandItem onSelect={onSelect} {...rest}>
      {children}
      {shortcut && (
        <div>
          {shortcut.split(' ').map((key) => {
            return <Shortcut key={key}>{key}</Shortcut>;
          })}
        </div>
      )}
    </CommandItem>
  );
};

Item.propTypes = {
  children: PropTypes.node.isRequired,
  shortcut: PropTypes.string,
  onSelect: PropTypes.func,
  displayOnSearchOnly: PropTypes.bool,
};

Item.defaultProps = {
  shortcut: '',
  onSelect() {},
  displayOnSearchOnly: false,
};

export default Item;
