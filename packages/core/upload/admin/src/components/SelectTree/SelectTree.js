/* eslint-disable react/prop-types */

import React, { useEffect, useState, useMemo } from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { components } from 'react-select';

import { Flex } from '@strapi/design-system/Flex';
import { Icon } from '@strapi/design-system/Icon';
import { ReactSelect as Select, pxToRem } from '@strapi/helper-plugin';
import { Typography } from '@strapi/design-system/Typography';
import ChevronUp from '@strapi/icons/ChevronUp';
import ChevronDown from '@strapi/icons/ChevronDown';

import flattenTree from './utils/flattenTree';

const ToggleButton = styled.button`
  align-self: flex-end;
  margin-left: auto;
`;

const hasParent = option => !option.parent;

const hasParentOrMatchesValue = (option, value) =>
  option.value === value || option.parent === value;

const SelectTree = ({ options: defaultOptions, ...props }) => {
  const flatDefaultOptions = useMemo(() => flattenTree(defaultOptions), [defaultOptions]);
  const toplevelDefaultOptions = useMemo(() => flatDefaultOptions.filter(hasParent), [
    flatDefaultOptions,
  ]);
  const [options, setOptions] = useState(toplevelDefaultOptions);
  const [openValues, setOpenValues] = useState([]);

  useEffect(() => {
    if (openValues.length === 0) {
      setOptions(toplevelDefaultOptions);
    }

    openValues.forEach(value => {
      const filtered = flatDefaultOptions.filter(
        option => hasParentOrMatchesValue(option, value) || hasParent(option)
      );

      setOptions(filtered);
    });
  }, [openValues, flatDefaultOptions, toplevelDefaultOptions]);

  function handleToggle(e, value) {
    e.preventDefault();
    e.stopPropagation();

    if (openValues.includes(value)) {
      setOpenValues(prev => prev.filter(prevData => prevData !== value));
    } else {
      setOpenValues(prev => [...prev, value]);
    }
  }

  const CustomOption = ({ children, data, ...props }) => {
    const hasChildren = data?.children?.length > 0;
    const { depth, value } = data;

    return (
      <>
        <components.Option {...props}>
          <Flex alignItems="start">
            <Typography textColor="neutral800">
              <span style={{ paddingLeft: `${depth * 10}px` }}>{children}</span>
            </Typography>

            {hasChildren && (
              <ToggleButton type="button" onClick={event => handleToggle(event, value)}>
                <Icon
                  width={pxToRem(14)}
                  color="neutral500"
                  as={openValues.includes(value) ? ChevronUp : ChevronDown}
                />
              </ToggleButton>
            )}
          </Flex>
        </components.Option>
      </>
    );
  };

  return <Select components={{ Option: CustomOption }} options={options} {...props} />;
};

SelectTree.propTypes = {
  options: PropTypes.array.isRequired,
};

export default SelectTree;
