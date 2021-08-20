import { Box, Checkbox, Text } from '@strapi/parts';
import upperFirst from 'lodash/upperFirst';
import PropTypes from 'prop-types';
import React, { memo } from 'react';
import styled from 'styled-components';
import CollapseLabel from '../CollapseLabel';
import { firstRowWidth } from '../Permissions/utils/constants';

const Wrapper = styled(Box)`
  display: flex;
  align-items: center;
  width: ${firstRowWidth};
  padding-left: ${({ theme }) => theme.spaces[6]};

  ${({ disabled, theme }) =>
    disabled &&
    `
    input[type='checkbox'] {
    cursor: not-allowed;
      &:after {
        color: ${theme.main.colors.grey};
      }
    }
  `};
`;

const StyledText = styled(Text)`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const RowLabelWithCheckbox = ({
  children,
  isCollapsable,
  isFormDisabled,
  label,
  onChange,
  onClick,
  checkboxName,
  someChecked,
  value,
}) => {
  return (
    <Wrapper disabled={isFormDisabled}>
      <Checkbox
        name={checkboxName}
        disabled={isFormDisabled}
        // Keep same signature as packages/core/admin/admin/src/components/Roles/Permissions/index.js l.91
        onValueChange={value =>
          onChange({
            target: {
              name: checkboxName,
              value,
            },
          })}
        indeterminate={someChecked}
        value={value}
      />
      <CollapseLabel
        title={label}
        alignItems="center"
        isCollapsable={isCollapsable}
        {...(isCollapsable && {
          onClick,
          onKeyDown: ({ key }) => (key === 'Enter' || key === ' ') && onClick(),
          tabIndex: 0,
          role: 'button',
        })}
      >
        <StyledText>{upperFirst(label)}</StyledText>
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
  value: PropTypes.bool,
};

export default memo(RowLabelWithCheckbox);
