/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { components } from 'react-select';
import { groupBy } from 'lodash';
import { Checkbox, Flex } from '@buffetjs/core';
import { Label } from '@buffetjs/styles';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import SubUl from './SubUl';
import Ul from './Ul';
import UpperFirst from './UpperFirst';

/* eslint-disable jsx-a11y/no-static-element-interactions */

const MenuList = ({ selectProps, ...rest }) => {
  const Component = components.MenuList;
  const [collapses, setCollapses] = useState({});
  const optionsGroupByCategory = groupBy(selectProps.options, 'category');
  const toggleCollapse = collapseName => {
    setCollapses(prevState => ({ ...prevState, [collapseName]: !collapses[collapseName] }));
  };

  const handleChange = action => {
    selectProps.onChange(action);
  };

  const handleCategoryChange = categoryActions => {
    selectProps.onCategoryChange(categoryActions);
  };

  const hasAction = useCallback(
    action => {
      return selectProps.value.findIndex(option => option.id === action.id) !== -1;
    },
    [selectProps.value]
  );

  const hasSomeCategoryAction = useCallback(
    categoryName => {
      const categoryActions = selectProps.value.filter(option => option.category === categoryName)
        .length;

      return categoryActions > 0 && categoryActions < optionsGroupByCategory[categoryName].length;
    },
    [optionsGroupByCategory, selectProps.value]
  );

  const hasAllCategoryAction = useCallback(
    categoryName => {
      const categoryActions = selectProps.value.filter(option => option.category === categoryName)
        .length;

      return categoryActions === optionsGroupByCategory[categoryName].length;
    },
    [optionsGroupByCategory, selectProps.value]
  );

  return (
    <Component {...rest}>
      <Ul>
        {Object.values(optionsGroupByCategory) === 0 && <div>zdazd</div>}
        {Object.entries(optionsGroupByCategory).map((category, index) => {
          return (
            <li key={category[0]}>
              <div>
                <Flex justifyContent="space-between">
                  <Label
                    htmlFor="overrideReactSelectBehavior"
                    onClick={() => handleCategoryChange(category[1])}
                  >
                    <Flex>
                      <Checkbox
                        id="checkCategory"
                        name={category[0]}
                        onChange={() => {}}
                        value={hasAllCategoryAction(category[0])}
                        someChecked={hasSomeCategoryAction(category[0])}
                      />
                      <UpperFirst content={category[0]} />
                    </Flex>
                  </Label>
                  <div
                    style={{ flex: 1, textAlign: 'end' }}
                    onClick={() => toggleCollapse(category[0])}
                  >
                    <FontAwesomeIcon
                      style={{
                        margin: 'auto',
                        fontSize: '11px',
                        color: '#919bae',
                      }}
                      icon={collapses[category[0]] ? 'chevron-up' : 'chevron-down'}
                    />
                  </div>
                </Flex>
              </div>
              <SubUl tag="ul" isOpen={collapses[category[0]]}>
                {category[1].map(action => {
                  return (
                    <li key={action.id}>
                      <Flex>
                        <Label
                          htmlFor={action.id}
                          message={action.displayName}
                          onClick={() => handleChange(action)}
                        >
                          <Flex>
                            <Checkbox
                              id="check"
                              name={action.id}
                              // Remove the handler
                              onChange={() => {}}
                              value={hasAction(action)}
                            />
                            {action.displayName}
                          </Flex>
                        </Label>
                      </Flex>
                    </li>
                  );
                })}
              </SubUl>
              {index + 1 < Object.entries(optionsGroupByCategory).length && (
                <div style={{ paddingTop: '17px' }} />
              )}
            </li>
          );
        })}
      </Ul>
    </Component>
  );
};

MenuList.propTypes = {
  selectProps: PropTypes.object.isRequired,
};
export default MenuList;
