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

const CustomCheckbox = ({
  label,
  modifiedData,
  name,
  onChange,
  value,
  ...rest
}) => {
  const [checked, setChecked] = useState(isNumber(value) || !isEmpty(value));
  const type = modifiedData.type === 'biginteger' ? 'text' : 'number';
  const step = ['decimal', 'float'].includes(modifiedData.type) ? 'any' : '1';
  const disabled = !modifiedData.type;

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
            step={step}
            disabled={disabled}
            value={value}
            type={type}
          />
        </div>
      )}
    </StyledCustomCheckbox>
  );
};

CustomCheckbox.defaultProps = {
  label: null,
  modifiedData: {},
  name: '',
  value: null,
};

CustomCheckbox.propTypes = {
  label: PropTypes.string,
  modifiedData: PropTypes.object,
  name: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

export default CustomCheckbox;
