/**
 *
 * InputCheckboxPlugin
 *
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useEditPageContext } from '../../contexts/EditPage';
import { Label, Wrapper } from './Components';

function InputCheckboxPlugin({
  inputSelected,
  label,
  name,
  setNewInputSelected,
  value,
}) {
  const {
    onChange,
    resetShouldDisplayPoliciesHint,
    setInputPoliciesPath,
    setShouldDisplayPolicieshint,
  } = useEditPageContext();
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

      setShouldDisplayPolicieshint();
      setInputPoliciesPath(name);
    } else {
      setNewInputSelected('');
    }

    onChange({ target });
  };

  const handleClick = () => {
    setNewInputSelected(name);
    setInputPoliciesPath(name);

    if (policiesShown && isSelected) {
      resetShouldDisplayPoliciesHint();
      setPoliciesShow(false);
    } else {
      setShouldDisplayPolicieshint();
      setPoliciesShow(true);
    }
  };

  return (
    <Wrapper className="col-md-4">
      <div
        className={`form-check ${
          isSelected && policiesShown ? 'highlighted' : ''
        }  ${value ? 'is-checked' : ''}`}
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
