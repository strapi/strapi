import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox, Text } from '@buffetjs/core';
import Wrapper from './Wrapper';

const CheckboxWithDescription = ({ description, error, label, value, ...rest }) => {
  return (
    <>
      <Wrapper>
        <Checkbox {...rest} message={label} label={label} type="checkbox" value={value} />
        {description && (
          <Text color="grey" title={description} fontSize="sm" ellipsis>
            {description}
          </Text>
        )}
        {error && (
          <Text color="lightOrange" lineHeight="18px">
            {error}
          </Text>
        )}
      </Wrapper>
    </>
  );
};

CheckboxWithDescription.defaultProps = {
  description: null,
  error: null,
  label: null,
  value: false,
};

CheckboxWithDescription.propTypes = {
  description: PropTypes.string,
  error: PropTypes.string,
  label: PropTypes.string,
  value: PropTypes.bool,
};

export default CheckboxWithDescription;
