/**
 *
 * InputCheckbox
 */

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Div, Label } from './components';

function InputCheckbox({ name, onChange, value }) {
  return (
    <Div
      className="col-12"
      onClick={e => {
        e.stopPropagation();
      }}
    >
      <div className="form-check">
        <Label className="form-check-label" htmlFor={name} value={value}>
          <input
            className="form-check-input"
            defaultChecked={value}
            id={name}
            name={name}
            onChange={onChange}
            type="checkbox"
          />
          {name}
        </Label>
      </div>
    </Div>
  );
}

InputCheckbox.defaultProps = {
  onChange: () => {},
  value: false,
};

InputCheckbox.propTypes = {
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  value: PropTypes.bool,
};

export default memo(InputCheckbox);
