import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox, Text } from '@buffetjs/core';
import Wrapper from './Wrapper';

const CheckboxWithDescription = ({ description, label, value, ...rest }) => {
  return (
    <>
      <Wrapper>
        <Checkbox {...rest} message={label} label={label} type="checkbox" value={value || false} />
        {description && (
          <Text color="grey" title={description} fontSize="sm" ellipsis>
            {description}
          </Text>
        )}
      </Wrapper>
    </>
  );
};

CheckboxWithDescription.defaultProps = {
  description: null,
  label: null,
  value: false,
};

CheckboxWithDescription.propTypes = {
  description: PropTypes.string,
  label: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
};

export default CheckboxWithDescription;
