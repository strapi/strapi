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

const Option = ({ children, data, onToggle, isOpen, maxDisplayDepth, ...props }) => {
  const hasChildren = data?.children?.length > 0;
  const { depth, value } = data;
  const normalizedDepth = Math.min(depth, maxDisplayDepth);

  return (
    <>
      <components.Option {...props}>
        <Flex alignItems="start">
          <Typography textColor="neutral800">
            <span style={{ paddingLeft: `${normalizedDepth * 10}px` }}>{children}</span>
          </Typography>

          {hasChildren && (
            <ToggleButton type="button" onClick={event => onToggle(event, value)}>
              <Icon width={pxToRem(14)} color="neutral500" as={isOpen ? ChevronUp : ChevronDown} />
            </ToggleButton>
          )}
        </Flex>
      </components.Option>
    </>
  );
};

Option.defaultProps = {
  isOpen: false,
  maxDisplayDepth: 5,
};

Option.propTypes = {
  children: PropTypes.arrayOf(PropTypes.element).isRequired,
  data: PropTypes.object.isRequired,
  isOpen: PropTypes.bool,
  maxDisplayDepth: PropTypes.number,
  onToggle: PropTypes.func.isRequired,
};

export default Option;
