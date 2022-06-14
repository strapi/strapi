import React, { useEffect, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { ReactSelect as Select } from '@strapi/helper-plugin';

import Option from './Option';

import flattenTree from './utils/flattenTree';
import getOpenValues from './utils/getOpenValues';

const hasParent = option => !option.parent;

const hasParentOrMatchesValue = (option, value) =>
  option.value === value || option.parent === value;

const SelectTree = ({ options: defaultOptions, maxDisplayDepth, defaultValue, ...props }) => {
  const flatDefaultOptions = useMemo(() => flattenTree(defaultOptions), [defaultOptions]);
  const optionsFiltered = useMemo(() => flatDefaultOptions.filter(hasParent), [flatDefaultOptions]);
  const [options, setOptions] = useState(optionsFiltered);
  const [openValues, setOpenValues] = useState(getOpenValues(flatDefaultOptions, defaultValue));

  useEffect(() => {
    if (openValues.length === 0) {
      setOptions(optionsFiltered);
    }

    openValues.forEach(value => {
      const filtered = flatDefaultOptions.filter(
        option => hasParentOrMatchesValue(option, value) || hasParent(option)
      );

      setOptions(filtered);
    });
  }, [openValues, flatDefaultOptions, optionsFiltered]);

  const handleToggle = value => {
    if (openValues.includes(value)) {
      setOpenValues(prev => prev.filter(prevData => prevData !== value));
    } else {
      setOpenValues(prev => [...prev, value]);
    }
  };

  return (
    <Select
      components={{ Option }}
      options={options}
      defaultValue={defaultValue}
      isSearchable={false}
      /* -- custom props, used by the Option component */
      maxDisplayDepth={maxDisplayDepth}
      openValues={openValues}
      onOptionToggle={handleToggle}
      /* -- / custom props */
      {...props}
    />
  );
};

const OptionShape = PropTypes.shape({
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  label: PropTypes.string.isRequired,
  children: PropTypes.array,
});

OptionShape.children = PropTypes.arrayOf(PropTypes.shape(OptionShape));

OptionShape.defaultProps = {
  children: undefined,
};

SelectTree.defaultProps = {
  defaultValue: undefined,
  maxDisplayDepth: 5,
};

SelectTree.propTypes = {
  defaultValue: PropTypes.shape({
    value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  }),
  maxDisplayDepth: PropTypes.number,
  options: PropTypes.arrayOf(OptionShape).isRequired,
};

export default SelectTree;
