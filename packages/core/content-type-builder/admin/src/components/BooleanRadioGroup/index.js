import React from 'react';

import PropTypes from 'prop-types';

import CustomRadioGroup from '../CustomRadioGroup';

const BooleanRadioGroup = ({ onChange, name, ...rest }) => {
  const handleChange = (e) => {
    const checked = e.target.value !== 'false';

    onChange({ target: { name, value: checked, type: 'boolean-radio-group' } });
  };

  return <CustomRadioGroup {...rest} name={name} onChange={handleChange} />;
};

BooleanRadioGroup.propTypes = {
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default BooleanRadioGroup;
