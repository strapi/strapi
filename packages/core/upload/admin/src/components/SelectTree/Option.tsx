import * as React from 'react';

import { Flex, Typography } from '@strapi/design-system';
import { ChevronDown, ChevronUp } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { components, OptionProps as ReactSelectOptionProps } from 'react-select';
import { styled } from 'styled-components';
import type { FolderStructure } from '../../../../shared/contracts/folders';

const ToggleButton = styled(Flex)`
  align-self: flex-end;
  height: 2.2rem;
  width: 2.8rem;

  &:hover,
  &:focus {
    background-color: ${({ theme }) => theme.colors.primary200};
  }
`;

interface FolderStructureParent extends FolderStructure {
  parent?: FolderStructureParent;
  path?: string;
  depth: number;
  value: string;
}

interface SelectProps {
  maxDisplayDepth: number;
  openValues: string[];
  onOptionToggle: (value: string) => void;
}

interface OptionProps extends ReactSelectOptionProps<FolderStructureParent, false> {
  selectProps: SelectProps & ReactSelectOptionProps<FolderStructureParent, false>['selectProps'];
}

const Option = ({ children, data, selectProps, innerRef, innerProps, ...rest }: OptionProps) => {
  const { formatMessage } = useIntl();
  const { depth, value, children: options } = data;
  const { maxDisplayDepth, openValues, onOptionToggle } = selectProps;
  const isOpen = openValues.includes(value);

  const Icon = isOpen ? ChevronUp : ChevronDown;

  return (
    <components.Option
      data={data}
      selectProps={selectProps}
      innerRef={innerRef}
      innerProps={innerProps}
      {...rest}
    >
      <Flex alignItems="start">
        <Typography textColor="neutral800" ellipsis>
          <span style={{ paddingLeft: `${Math.min(depth, maxDisplayDepth) * 14}px` }}>
            {children}
          </span>
        </Typography>

        {options && options?.length > 0 && (
          <ToggleButton
            aria-label={formatMessage({
              id: 'app.utils.toggle',
              defaultMessage: 'Toggle',
            })}
            tag="button"
            alignItems="center"
            hasRadius
            justifyContent="center"
            marginLeft="auto"
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              event.preventDefault();
              event.stopPropagation();

              onOptionToggle(value);
            }}
          >
            <Icon width="1.4rem" fill="neutral500" />
          </ToggleButton>
        )}
      </Flex>
    </components.Option>
  );
};

export default Option;
