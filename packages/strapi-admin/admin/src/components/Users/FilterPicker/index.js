import React from 'react';
// import PropTypes from 'prop-types';
// import { FormattedMessage } from 'react-intl';
import { Picker } from '@buffetjs/core';
import Button from './Button';

const FilterPicker = () => {
  return <Picker renderButtonContent={Button} />;
};

export default FilterPicker;
