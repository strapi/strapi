/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { components } from 'react-select';
import { get } from 'lodash';
import { Checkbox, Flex } from '@buffetjs/core';
import { Label } from '@buffetjs/styles';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import IS_DISABLED from 'ee_else_ce/components/Roles/ConditionsModal/ConditionsSelect/MenuList/utils/constants';
import { getCheckboxState } from '../../../utils';
import createCollapsesObject from './utils/createCollapsesObject';
import SubUl from './SubUl';
import Ul from './Ul';
import UpperFirst from './UpperFirst';

/* eslint-disable jsx-a11y/no-static-element-interactions */

const MenuList = ({ selectProps, ...rest }) => {
  const Component = components.MenuList;
  const { arrayOfOptionsGroupedByCategory } = selectProps;

  const initCollapses = useMemo(() => createCollapsesObject(arrayOfOptionsGroupedByCategory), [
    arrayOfOptionsGroupedByCategory,
  ]);
  const [collapses, setCollapses] = useState(initCollapses);

  const toggleCollapse = collapseName => {
    setCollapses(prevState => ({ ...prevState, [collapseName]: !collapses[collapseName] }));
  };

  return (
    <Component {...rest}>
      <Ul disabled={IS_DISABLED}>
        {arrayOfOptionsGroupedByCategory.map((category, index) => {
          const [categoryName, conditions] = category;
          const checkboxName = `${selectProps.name}..${categoryName}`;

          const {
            hasAllActionsSelected: hasAllConditionsSelected,
            hasSomeActionsSelected: hasSomeConditionsSelected,
          } = getCheckboxState(selectProps.value);

          return (
            <li key={categoryName}>
              <div>
                <Flex justifyContent="space-between">
                  <Label
                    htmlFor="overrideReactSelectBehavior"
                    onClick={() => {
                      if (!IS_DISABLED) {
                        selectProps.onCategoryChange({
                          keys: [selectProps.name, categoryName],
                          value: !hasAllConditionsSelected,
                        });
                      }
                    }}
                  >
                    <Flex>
                      <Checkbox
                        disabled={IS_DISABLED}
                        id="checkCategory"
                        name={checkboxName}
                        onChange={() => {}}
                        someChecked={hasSomeConditionsSelected}
                        value={hasAllConditionsSelected}
                      />
                      <UpperFirst content={categoryName} />
                    </Flex>
                  </Label>
                  <div
                    style={{ flex: 1, textAlign: 'end', cursor: 'pointer' }}
                    onClick={() => toggleCollapse(categoryName)}
                  >
                    <FontAwesomeIcon
                      style={{
                        margin: 'auto',
                        fontSize: '11px',
                        color: '#919bae',
                      }}
                      icon={collapses[categoryName] ? 'chevron-up' : 'chevron-down'}
                    />
                  </div>
                </Flex>
              </div>
              <SubUl tag="ul" isOpen={collapses[categoryName]}>
                {conditions.map(condition => {
                  const checkboxValue = get(selectProps.value, [categoryName, condition.id], false);

                  return (
                    <li key={condition.id}>
                      <Flex>
                        <Label
                          htmlFor={condition.id}
                          message={condition.displayName}
                          onClick={() => {
                            if (!IS_DISABLED) {
                              selectProps.onChange({
                                keys: [selectProps.name, categoryName, condition.id],
                                value: !checkboxValue,
                              });
                            }
                          }}
                        >
                          <Flex>
                            <Checkbox
                              id="check"
                              name={condition.id}
                              // Remove the handler
                              onChange={() => {}}
                              value={checkboxValue}
                            />
                            {condition.displayName}
                          </Flex>
                        </Label>
                      </Flex>
                    </li>
                  );
                })}
              </SubUl>
              {index + 1 < arrayOfOptionsGroupedByCategory.length.length && (
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
  selectProps: PropTypes.shape({
    arrayOfOptionsGroupedByCategory: PropTypes.array.isRequired,
    name: PropTypes.string.isRequired,
    onCategoryChange: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired,
    value: PropTypes.object.isRequired,
  }).isRequired,
};
export default MenuList;
