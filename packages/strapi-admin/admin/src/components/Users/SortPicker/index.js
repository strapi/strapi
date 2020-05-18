import React from 'react';
import { Picker } from '@buffetjs/core';
import Button from './Button';
import List from './List';

const SortPicker = () => {
  return (
    <Picker renderButtonContent={Button} renderSectionContent={() => <List selectedItem="" />} />
  );
};

export default SortPicker;
