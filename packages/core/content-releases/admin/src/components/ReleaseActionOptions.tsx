import * as React from 'react';

import {
  FieldInput,
  FieldLabel,
  VisuallyHidden,
  Field,
  type FieldProps,
} from '@strapi/design-system';
import styled from 'styled-components';

interface FieldWrapperProps extends FieldProps {
  actionType: 'publish' | 'unpublish';
}

const getBorderLeftRadiusValue = (actionType: FieldWrapperProps['actionType']) => {
  return actionType === 'publish' ? 1 : 0;
};

const getBorderRightRadiusValue = (actionType: FieldWrapperProps['actionType']) => {
  return actionType === 'publish' ? 0 : 1;
};

const FieldWrapper = styled(Field)<FieldWrapperProps>`
  border-top-left-radius: ${({ actionType, theme }) =>
    theme.spaces[getBorderLeftRadiusValue(actionType)]};
  border-bottom-left-radius: ${({ actionType, theme }) =>
    theme.spaces[getBorderLeftRadiusValue(actionType)]};
  border-top-right-radius: ${({ actionType, theme }) =>
    theme.spaces[getBorderRightRadiusValue(actionType)]};
  border-bottom-right-radius: ${({ actionType, theme }) =>
    theme.spaces[getBorderRightRadiusValue(actionType)]};

  > label {
    color: inherit;
    padding: ${({ theme }) => `${theme.spaces[2]} ${theme.spaces[3]}`};
    text-align: center;
    vertical-align: middle;
    text-transform: capitalize;
  }

  &:active,
  &.selected {
    color: ${({ theme }) => theme.colors.primary700};
    background-color: ${({ theme }) => theme.colors.primary100};
    border-color: ${({ theme }) => theme.colors.primary700};
  }
`;

interface ActionOptionProps {
  selected: 'publish' | 'unpublish';
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

interface OptionProps extends ActionOptionProps {
  actionType: 'publish' | 'unpublish';
}

const ActionOption = ({ selected, actionType, handleChange }: OptionProps) => {
  return (
    <FieldWrapper
      actionType={actionType}
      className={selected === actionType ? 'selected' : undefined}
      background="primary0"
      borderColor="neutral200"
      color={selected === actionType ? 'primary600' : 'neutral600'}
      position="relative"
      cursor="pointer"
    >
      <FieldLabel htmlFor={`release-action-${actionType}`}>
        <VisuallyHidden>
          <FieldInput
            type="radio"
            id={`release-action-${actionType}`}
            name="type"
            checked={selected === actionType}
            onChange={handleChange}
            value={actionType}
          />
        </VisuallyHidden>
        {actionType}
      </FieldLabel>
    </FieldWrapper>
  );
};

export const ReleaseActionOptions = ({ selected, handleChange }: ActionOptionProps) => {
  return (
    <>
      <ActionOption actionType="publish" selected={selected} handleChange={handleChange} />
      <ActionOption actionType="unpublish" selected={selected} handleChange={handleChange} />
    </>
  );
};
