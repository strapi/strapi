import React from 'react';
import PropTypes from 'prop-types';
import { Picker } from '@buffetjs/core';
import BaselineAlignment from '../../BaselineAlignement';

import Button from './Button';
import Card from './Card';

const FilterPicker = ({ onChange }) => {
  return (
    <BaselineAlignment bottom size="6px">
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
    </BaselineAlignment>
  );
};

FilterPicker.defaultProps = {
  onChange: () => {},
};

FilterPicker.propTypes = {
  onChange: PropTypes.func,
};

export default FilterPicker;
