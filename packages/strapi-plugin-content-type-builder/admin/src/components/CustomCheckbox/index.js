/**
 *
 * CustomCheckbox
 *
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { isEmpty, isNumber } from 'lodash';
import { Inputs } from '@buffetjs/custom';
import StyledCustomCheckbox from './StyledCustomCheckbox';

const CustomCheckbox = ({ label, name, onChange, value, ...rest }) => {
  const [checked, setChecked] = useState(isNumber(value) || !isEmpty(value));

  return (
    <StyledCustomCheckbox>
      <Inputs
        label={label}
        name={name}
        type="checkbox"
        value={checked}
        onChange={() => {
          if (checked) {
            onChange({
              target: {
                name,
                value: null,
              },
            });
          }
          setChecked(prev => !prev);
        }}
      />
      {checked && (
        <div className="no-label col-6">
          <Inputs
            {...rest}
            name={name}
            onChange={onChange}
            value={value}
            type="number"
          />
        </div>
      )}
    </StyledCustomCheckbox>
  );
};

CustomCheckbox.defaultProps = {
  label: null,
  name: '',
  value: null,
};

CustomCheckbox.propTypes = {
  label: PropTypes.string,
  name: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

export default CustomCheckbox;
