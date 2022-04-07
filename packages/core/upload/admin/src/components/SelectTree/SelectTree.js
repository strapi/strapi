/* eslint-disable react/prop-types */

import React, { useEffect, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { ReactSelect as Select } from '@strapi/helper-plugin';

import Option from './Option';

import flattenTree from './utils/flattenTree';

const hasParent = option => !option.parent;

const hasParentOrMatchesValue = (option, value) =>
  option.value === value || option.parent === value;

const SelectTree = ({ options: defaultOptions, maxDisplayDepth, ...props }) => {
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

  return (
    <Select
      components={{
        Option: props => (
          <Option
            {...props}
            onToggle={(...args) => handleToggle(...args)}
            isOpen={openValues.includes(props.data?.value)}
            maxDisplayDepth={maxDisplayDepth}
          />
        ),
      }}
      options={options}
      {...props}
    />
  );
};

const OptionShape = PropTypes.shape({
  value: PropTypes.number.isRequired,
  label: PropTypes.string.isRequired,
  children: PropTypes.array,
});

OptionShape.children = PropTypes.arrayOf(PropTypes.shape(OptionShape));

OptionShape.defaultProps = {
  children: undefined,
};

SelectTree.defaultProps = {
  maxDisplayDepth: 5,
};

SelectTree.propTypes = {
  maxDisplayDepth: PropTypes.number,
  options: PropTypes.arrayOf(OptionShape).isRequired,
};

export default SelectTree;
