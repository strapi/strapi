import React from 'react';
import PropTypes from 'prop-types';
import { Select, Field, Stack, FieldInput, Option } from '@strapi/parts';

const Inputs = ({ onChange, type, value }) => {
  if (type === 'boolean') {
    return (
      <Select onChange={onChange} value={value}>
        <Option value="true">true</Option>
        <Option value="false">false</Option>
      </Select>
    );
  }

  // TODO improve

  return (
    <Field>
      <Stack>
        <FieldInput onChange={({ target: { value } }) => onChange(value)} value={value} size="S" />
      </Stack>
    </Field>
  );
};

Inputs.defaultProps = {
  value: '',
};

Inputs.propTypes = {
  onChange: PropTypes.func.isRequired,
  type: PropTypes.string.isRequired,
  value: PropTypes.any,
};

export default Inputs;
