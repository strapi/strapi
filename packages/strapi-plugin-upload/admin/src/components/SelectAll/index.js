import React from 'react';
import { Checkbox } from '@buffetjs/core';
import Wrapper from './Wrapper';

const SelectAll = () => {
  return (
    <Wrapper>
      <Checkbox name="selectAll" />
    </Wrapper>
  );
};

export default SelectAll;
