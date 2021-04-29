import React from 'react';
import PropTypes from 'prop-types';
import { Picker } from '@buffetjs/core';

import Button from './Button';
import Card from './Card';

const FilterPicker = ({ onChange }) => {
  return (
    <Picker
      renderButtonContent={Button}
      renderSectionContent={onToggle => (
        <Card
          onChange={({ value, ...rest }) => {
            if (value !== '') {
              onChange({ ...rest, value });
            }

            onToggle();
          }}
        />
      )}
    />
  );
};

FilterPicker.defaultProps = {
  onChange: () => {},
};

FilterPicker.propTypes = {
  onChange: PropTypes.func,
};

export default FilterPicker;
