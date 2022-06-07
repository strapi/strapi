import PropTypes from 'prop-types';
import React from 'react';
import { components } from 'react-select';
import styled from 'styled-components';

import { Flex } from '@strapi/design-system/Flex';
import { Icon } from '@strapi/design-system/Icon';
import { pxToRem } from '@strapi/helper-plugin';
import { Typography } from '@strapi/design-system/Typography';
import ChevronUp from '@strapi/icons/ChevronUp';
import ChevronDown from '@strapi/icons/ChevronDown';

const ToggleButton = styled.button`
  align-self: flex-end;
  margin-left: auto;
`;

const Option = ({ children, data, selectProps, ...props }) => {
  const { depth, value, children: options } = data;
  const { maxDisplayDepth, openValues, onOptionToggle } = selectProps;
  const isOpen = openValues.includes(value);

  return (
    <>
      <components.Option {...props}>
        <Flex alignItems="start">
          <Typography textColor="neutral800">
            <span style={{ paddingLeft: `${Math.min(depth, maxDisplayDepth) * 10}px` }}>
              {children}
            </span>
          </Typography>

          {options?.length > 0 && (
            <ToggleButton
              type="button"
              onClick={event => {
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
    </>
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
