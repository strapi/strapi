import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox } from '@buffetjs/core';
import Wrapper from './Wrapper';

const SelectAll = ({ checked, onChange, someChecked }) => {
  return (
    <Wrapper>
      <Checkbox name="selectAll" onChange={onChange} value={checked} someChecked={someChecked} />
    </Wrapper>
  );
};

SelectAll.defaultProps = {
  checked: false,
  onChange: () => {},
  someChecked: false,
};

SelectAll.propTypes = {
  checked: PropTypes.bool,
  onChange: PropTypes.func,
  someChecked: PropTypes.bool,
};

export default SelectAll;
