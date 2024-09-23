import * as React from 'react';

import { VisuallyHidden, Field, Flex } from '@strapi/design-system';
import { styled } from 'styled-components';

interface FieldWrapperProps extends Field.Props {
  actionType: 'publish' | 'unpublish';
}

const getBorderLeftRadiusValue = (actionType: FieldWrapperProps['actionType']) => {
  return actionType === 'publish' ? 1 : 0;
};

const getBorderRightRadiusValue = (actionType: FieldWrapperProps['actionType']) => {
  return actionType === 'publish' ? 0 : 1;
};

const FieldWrapper = styled(Field.Root)<{
  $actionType: 'publish' | 'unpublish';
}>`
  border-top-left-radius: ${({ $actionType, theme }) =>
    theme.spaces[getBorderLeftRadiusValue($actionType)]};
  border-bottom-left-radius: ${({ $actionType, theme }) =>
    theme.spaces[getBorderLeftRadiusValue($actionType)]};
  border-top-right-radius: ${({ $actionType, theme }) =>
    theme.spaces[getBorderRightRadiusValue($actionType)]};
  border-bottom-right-radius: ${({ $actionType, theme }) =>
    theme.spaces[getBorderRightRadiusValue($actionType)]};

  > label {
    color: inherit;
    padding: ${({ theme }) => `${theme.spaces[2]} ${theme.spaces[3]}`};
    text-align: center;
    vertical-align: middle;
    text-transform: capitalize;
  }

  &[data-checked='true'] {
    color: ${({ theme, $actionType }) =>
      $actionType === 'publish' ? theme.colors.primary700 : theme.colors.danger600};
    background-color: ${({ theme, $actionType }) =>
      $actionType === 'publish' ? theme.colors.primary100 : theme.colors.danger100};
    border-color: ${({ theme, $actionType }) =>
      $actionType === 'publish' ? theme.colors.primary700 : theme.colors.danger600};
  }

  &[data-checked='false'] {
    border-left: ${({ $actionType }) => $actionType === 'unpublish' && 'none'};
    border-right: ${({ $actionType }) => $actionType === 'publish' && 'none'};
  }

  &[data-checked='false'][data-disabled='false']:hover {
    color: ${({ theme }) => theme.colors.neutral700};
    background-color: ${({ theme }) => theme.colors.neutral100};
    border-color: ${({ theme }) => theme.colors.neutral200};

    & > label {
      cursor: pointer;
    }
  }

  &[data-disabled='true'] {
    color: ${({ theme }) => theme.colors.neutral600};
    background-color: ${({ theme }) => theme.colors.neutral150};
    border-color: ${({ theme }) => theme.colors.neutral300};
  }
`;

interface ActionOptionProps {
  selected: 'publish' | 'unpublish';
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name: string;
  disabled?: boolean;
}

interface OptionProps extends ActionOptionProps {
  actionType: 'publish' | 'unpublish';
}

const ActionOption = ({
  selected,
  actionType,
  handleChange,
  name,
  disabled = false,
}: OptionProps) => {
  return (
    <FieldWrapper
      $actionType={actionType}
      background="primary0"
      borderColor="neutral200"
      color={selected === actionType ? 'primary600' : 'neutral600'}
      position="relative"
      cursor="pointer"
      data-checked={selected === actionType}
      data-disabled={disabled && selected !== actionType}
    >
      <Field.Label>
        <VisuallyHidden>
          <Field.Input
            type="radio"
            name={name}
            checked={selected === actionType}
            onChange={handleChange}
            value={actionType}
            disabled={disabled}
          />
        </VisuallyHidden>
        {actionType}
      </Field.Label>
    </FieldWrapper>
  );
};

export const ReleaseActionOptions = ({
  selected,
  handleChange,
  name,
  disabled = false,
}: ActionOptionProps) => {
  return (
    <Flex>
      <ActionOption
        actionType="publish"
        selected={selected}
        handleChange={handleChange}
        name={name}
        disabled={disabled}
      />
      <ActionOption
        actionType="unpublish"
        selected={selected}
        handleChange={handleChange}
        name={name}
        disabled={disabled}
      />
    </Flex>
  );
};
