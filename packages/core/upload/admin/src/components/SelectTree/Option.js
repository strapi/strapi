import PropTypes from 'prop-types';
import React from 'react';
import { useIntl } from 'react-intl';
import { components } from 'react-select';
import styled from 'styled-components';

import { Flex, Icon, Typography } from '@strapi/design-system';
import { pxToRem } from '@strapi/helper-plugin';
import ChevronUp from '@strapi/icons/ChevronUp';
import ChevronDown from '@strapi/icons/ChevronDown';

const ToggleButton = styled(Flex)`
  align-self: flex-end;
  height: ${pxToRem(22)};
  width: ${pxToRem(28)};

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
            as="button"
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
            <Icon width={pxToRem(14)} color="neutral500" as={isOpen ? ChevronUp : ChevronDown} />
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
