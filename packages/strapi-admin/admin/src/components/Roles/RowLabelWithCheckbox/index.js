import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Checkbox, Text } from '@buffetjs/core';
import CollapseLabel from '../CollapseLabel';
import Wrapper from './Wrapper';

const RowLabelWithCheckbox = ({
  children,
  isCollapsable,
  isFormDisabled,
  label,
  onChange,
  onClick,
  checkboxName,
  someChecked,
  textColor,
  value,
  width,
}) => {
  return (
    <Wrapper width={width} disabled={isFormDisabled}>
      <Checkbox
        name={checkboxName}
        disabled={isFormDisabled}
        onChange={onChange}
        someChecked={someChecked}
        value={value}
      />
      <CollapseLabel
        title={label}
        alignItems="center"
        isCollapsable={isCollapsable}
        onClick={onClick}
      >
        <Text
          color={textColor}
          ellipsis
          fontSize="xs"
          fontWeight="bold"
          lineHeight="20px"
          textTransform="uppercase"
        >
          {label}
        </Text>
        {children}
      </CollapseLabel>
    </Wrapper>
  );
};

RowLabelWithCheckbox.defaultProps = {
  children: null,
  checkboxName: '',
  onChange: () => {},
  value: false,
  someChecked: false,
  isCollapsable: false,
  textColor: 'grey',
  width: '18rem',
};

RowLabelWithCheckbox.propTypes = {
  checkboxName: PropTypes.string,
  children: PropTypes.node,
  label: PropTypes.string.isRequired,
  isCollapsable: PropTypes.bool,
  isFormDisabled: PropTypes.bool.isRequired,
  onChange: PropTypes.func,
  onClick: PropTypes.func.isRequired,
  someChecked: PropTypes.bool,
  textColor: PropTypes.string,
  value: PropTypes.bool,
  width: PropTypes.string,
};

export default memo(RowLabelWithCheckbox);
