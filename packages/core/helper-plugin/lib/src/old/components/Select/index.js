import React from 'react';
import ReactSelect from 'react-select';
import PropTypes from 'prop-types';
import { useTheme } from 'styled-components';
import DropdownIndicator from './DropdownIndicator';
import getStyles from './styles';

export const Select = ({ children, onChange, selectedValue, ...props }) => {
  const theme = useTheme();
  const selectStyles = getStyles(theme);
  const childrenArray = React.Children.toArray(children);

  const options = childrenArray.map(child => ({
    value: child.props.value,
    label: child.props.children,
  }));

  const selectedOption = options.find(({ value }) => value === selectedValue);

  return (
    <ReactSelect
      {...props}
      options={options}
      onChange={({ value }) => onChange(value)}
      components={{ DropdownIndicator }}
      styles={selectStyles}
      value={selectedOption}
    />
  );
};

/**
 * Do not remove this component.
 * The Select component is a mimic of the select HTML element:
 * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/select
 * The Select component will map over its "Option" components and verify their
 * "value" in order to pass them down to react-select
 */
export const Option = () => <></>;

Select.defaultProps = {
  selectedValue: undefined,
};

Select.propTypes = {
  children: PropTypes.node.isRequired,
  onChange: PropTypes.func.isRequired,
  selectedValue: PropTypes.string,
};

export const selectStyles = getStyles;
