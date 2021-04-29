import React from 'react';
import { components } from 'react-select';
import PropTypes from 'prop-types';
import StyledOption from './StyledOption';

const MultiValueContainer = ({ data, selectProps }) => {
  const Component = components.MultiValueContainer;

  const handleClick = () => {
    const newValue = selectProps.value.filter(option => option.id !== data.id);

    selectProps.onChange(newValue);
  };

  return (
    <Component {...data} {...selectProps}>
      <StyledOption
        label={data.name}
        height="24px"
        lineHeight="26px"
        margin="2px 5px 0px 0"
        onClick={handleClick}
      />
    </Component>
  );
};

MultiValueContainer.defaultProps = {
  data: {},
  selectProps: {
    value: [],
  },
};

MultiValueContainer.propTypes = {
  data: PropTypes.object,
  selectProps: PropTypes.shape({
    onChange: PropTypes.func.isRequired,
    value: PropTypes.array,
  }),
};

export default MultiValueContainer;
