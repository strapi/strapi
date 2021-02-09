/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useMemo, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { components } from 'react-select';
import { groupBy, intersectionWith } from 'lodash';
import { Checkbox, Flex } from '@buffetjs/core';
import { Label } from '@buffetjs/styles';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import SubUl from '../../../../../../admin/src/components/Roles/ConditionsSelect/MenuList/SubUl';
import Ul from '../../../../../../admin/src/components/Roles/ConditionsSelect/MenuList/Ul';
import UpperFirst from '../../../../../../admin/src/components/Roles/ConditionsSelect/MenuList/UpperFirst';
import { usePermissionsContext } from '../../../../../../admin/src/hooks';

/* eslint-disable jsx-a11y/no-static-element-interactions */
const createCollapsesObject = arrayOfCategories =>
  arrayOfCategories.reduce((acc, current, index) => {
    acc[current[0]] = index === 0;

    return acc;
  }, {});

const MenuList = ({ selectProps, ...rest }) => {
  const Component = components.MenuList;
  const { isSuperAdmin } = usePermissionsContext();

  const arrayOfOptionsGroupedByCategory = useMemo(() => {
    return Object.entries(groupBy(selectProps.options, 'category'));
  }, [selectProps.options]);
  const initCollapses = useMemo(() => createCollapsesObject(arrayOfOptionsGroupedByCategory), [
    arrayOfOptionsGroupedByCategory,
  ]);

  const [collapses, setCollapses] = useState(initCollapses);

  const toggleCollapse = collapseName => {
    setCollapses(prevState => ({ ...prevState, [collapseName]: !collapses[collapseName] }));
  };

  const handleChange = condition => {
    if (!isSuperAdmin) {
      selectProps.onChange(condition.id);
    }
  };

  const handleCategoryChange = categoryConditions => {
    const formattedCategories = categoryConditions.map(condition => condition.id);

    if (!isSuperAdmin) {
      selectProps.onCategoryChange(formattedCategories);
    }
  };

  const hasAction = useCallback(
    condition => {
      return selectProps.value.includes(condition.id);
    },
    [selectProps.value]
  );

  const hasSomeCategoryAction = useCallback(
    category => {
      const formattedCategories = category[1].map(condition => condition.id);

      const categoryActions = intersectionWith(formattedCategories, selectProps.value).length;

      return categoryActions > 0 && categoryActions < formattedCategories.length;
    },
    [selectProps.value]
  );

  const hasAllCategoryAction = useCallback(
    category => {
      const formattedCategories = category[1].map(condition => condition.id);

      const categoryActions = intersectionWith(formattedCategories, selectProps.value).length;

      return categoryActions === formattedCategories.length;
    },
    [selectProps.value]
  );

  return (
    <Component {...rest}>
      <Ul>
        {arrayOfOptionsGroupedByCategory.map((category, index) => {
          const [categoryName, conditions] = category;

          return (
            <li key={category[0]}>
              <div>
                <Flex justifyContent="space-between">
                  <Label
                    htmlFor="overrideReactSelectBehavior"
                    onClick={() => handleCategoryChange(conditions)}
                  >
                    <Flex>
                      <Checkbox
                        id="checkCategory"
                        name={categoryName}
                        onChange={() => {}}
                        value={hasAllCategoryAction(category)}
                        someChecked={hasSomeCategoryAction(category)}
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
                {conditions.map(action => {
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
              {index + 1 < arrayOfOptionsGroupedByCategory.length && (
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
