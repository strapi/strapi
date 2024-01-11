import * as React from 'react';

import {
  FieldInput,
  FieldLabel,
  VisuallyHidden,
  Field,
  Flex,
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
  &[data-checked='true'] {
    color: ${({ theme }) => theme.colors.primary700};
    background-color: ${({ theme }) => theme.colors.primary100};
    border-color: ${({ theme }) => theme.colors.primary700};
  }

  &[data-checked='false'] {
    border-left: ${({ actionType }) => actionType === 'unpublish' && 'none'};
    border-right: ${({ actionType }) => actionType === 'publish' && 'none'};
  }
`;

interface ActionOptionProps {
  selected: 'publish' | 'unpublish';
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name: string;
}

interface OptionProps extends ActionOptionProps {
  actionType: 'publish' | 'unpublish';
}

const ActionOption = ({ selected, actionType, handleChange, name }: OptionProps) => {
  return (
    <FieldWrapper
      actionType={actionType}
      background="primary0"
      borderColor="neutral200"
      color={selected === actionType ? 'primary600' : 'neutral600'}
      position="relative"
      cursor="pointer"
      data-checked={selected === actionType}
    >
      <FieldLabel htmlFor={`${name}-${actionType}`}>
        <VisuallyHidden>
          <FieldInput
            type="radio"
            id={`${name}-${actionType}`}
            name={name}
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

export const ReleaseActionOptions = ({ selected, handleChange, name }: ActionOptionProps) => {
  return (
    <Flex>
      <ActionOption
        actionType="publish"
        selected={selected}
        handleChange={handleChange}
        name={name}
      />
      <ActionOption
        actionType="unpublish"
        selected={selected}
        handleChange={handleChange}
        name={name}
      />
    </Flex>
  );
};
