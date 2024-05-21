import React from 'react';

import { Flex, Typography } from '@strapi/design-system';
import { ChevronDown, ChevronUp } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { components } from 'react-select';
import { styled } from 'styled-components';

const ToggleButton = styled(Flex)`
  align-self: flex-end;
  height: 2.2rem;
  width: 2.8rem;

  &:hover,
  &:focus {
    background-color: ${({ theme }) => theme.colors.primary200};
  }
`;

const Option = ({ children, data, selectProps, ...props }) => {
  const { formatMessage } = useIntl();
  const { depth, value, children: options } = data;
  const { maxDisplayDepth, openValues, onOptionToggle } = selectProps;
  const isOpen = openValues.includes(value);

  const Icon = isOpen ? ChevronUp : ChevronDown;

  return (
    <components.Option {...props}>
      <Flex alignItems="start">
        <Typography textColor="neutral800" ellipsis>
          <span style={{ paddingLeft: `${Math.min(depth, maxDisplayDepth) * 14}px` }}>
            {children}
          </span>
        </Typography>

        {options?.length > 0 && (
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
            onClick={(event) => {
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

Option.propTypes = {
  children: PropTypes.node.isRequired,
  data: PropTypes.object.isRequired,
  onToggle: PropTypes.func.isRequired,
  selectProps: PropTypes.shape({
    maxDisplayDepth: PropTypes.number,
    openValues: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
    onOptionToggle: PropTypes.func,
  }).isRequired,
};

export default Option;
