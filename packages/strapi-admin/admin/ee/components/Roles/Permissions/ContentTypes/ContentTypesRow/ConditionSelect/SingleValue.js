import React from 'react';
import PropTypes from 'prop-types';
import { components } from 'react-select';
import { Text } from '@buffetjs/core';

const Value = ({ children, selectProps, ...props }) => {
  const SingleValue = components.SingleValue;

  return (
    <SingleValue {...props}>
      <Text>
        {selectProps.value.length === 0
          ? 'Anytime'
          : `${selectProps.value.length} conditions selected`}
      </Text>
    </SingleValue>
  );
};

Value.defaultProps = {
  children: null,
  selectProps: {
    value: [],
  },
};

Value.propTypes = {
  children: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
  selectProps: PropTypes.shape({
    value: PropTypes.array,
  }),
};

export default Value;
