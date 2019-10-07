/**
 *
 * InputCheckboxPlugin
 *
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';

import { Label, Wrapper } from './Components';

function InputCheckboxPlugin(
  { inputSelected, label, name, setNewInputSelected, value },
  context
) {
  const isSelected = inputSelected === name;
  const [policiesShown, setPoliciesShow] = useState(false);

  const handleChange = () => {
    const target = {
      type: 'checkbox',
      name: name,
      value: !value,
    };

    if (!value) {
      setPoliciesShow(true);
      setNewInputSelected(name);

      context.setShouldDisplayPolicieshint();
      context.setInputPoliciesPath(name);
    } else {
      setNewInputSelected('');
    }

    context.onChange({ target });
  };

  const handleClick = () => {
    setNewInputSelected(name);
    context.setInputPoliciesPath(name);

    if (policiesShown && isSelected) {
      context.resetShouldDisplayPoliciesHint();
      setPoliciesShow(false);
    } else {
      context.setShouldDisplayPolicieshint();
      setPoliciesShow(true);
    }
  };

  return (
    <Wrapper className="col-md-4">
      <div
        className={`form-check ${isSelected ? 'highlighted' : ''}  ${
          value ? 'is-checked' : ''
        }`}
      >
        <Label
          className={`form-check-label ${value ? 'checked' : ''}`}
          htmlFor={name}
        >
          <input
            className="form-check-input"
            defaultChecked={value}
            id={name}
            name={name}
            onChange={handleChange}
            type="checkbox"
          />
          {label}
        </Label>
        <i className="fa fa-cog" onClick={handleClick} />
      </div>
    </Wrapper>
  );
}

InputCheckboxPlugin.contextTypes = {
  onChange: PropTypes.func.isRequired,
  resetShouldDisplayPoliciesHint: PropTypes.func.isRequired,
  setInputPoliciesPath: PropTypes.func.isRequired,
  setShouldDisplayPolicieshint: PropTypes.func.isRequired,
};

InputCheckboxPlugin.defaultProps = {
  label: '',
  value: false,
};

InputCheckboxPlugin.propTypes = {
  inputSelected: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  setNewInputSelected: PropTypes.func.isRequired,
  value: PropTypes.bool,
};

export default InputCheckboxPlugin;
