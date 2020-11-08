import React, { useState } from 'react';
import PropTypes from 'prop-types';
import UpperFirst from '../UpperFirst';
import Icon from './Icon';
import Item from './Item';
import Menu from './Menu';
import Toggle from './Toggle';
import Wrapper from './Wrapper';

/* eslint-disable react/no-array-index-key */

const DropdownInfos = ({ headers, shouldDisplaySecondHeader }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggle = () => setDropdownOpen(prevState => !prevState);

  return (
    <Wrapper isOpen={dropdownOpen} toggle={toggle} style={{ margin: 'auto 0' }}>
      <Toggle>...</Toggle>
      <Menu style={{ top: '8px' }}>
        {headers.map((header, index) => {
          if (!shouldDisplaySecondHeader && index === 1) {
            return null;
          }

          return (
            <Item key={index}>
              <Icon type={header.icon.name} />
              <span>
                <UpperFirst content={header.label} />
              </span>
            </Item>
          );
        })}
      </Menu>
    </Wrapper>
  );
};

DropdownInfos.defaultProps = {
  headers: [],
  shouldDisplaySecondHeader: false,
};

DropdownInfos.propTypes = {
  headers: PropTypes.array,
  shouldDisplaySecondHeader: PropTypes.bool,
};

export default DropdownInfos;
