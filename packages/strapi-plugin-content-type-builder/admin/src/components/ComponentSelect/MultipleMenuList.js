import React from 'react';
import PropTypes from 'prop-types';
import { components } from 'react-select';
import { get } from 'lodash';
// import { Label } from '@buffetjs/core';
import { Checkbox, CheckboxWrapper, Label } from '@buffetjs/styles';
import useDataManager from '../../hooks/useDataManager';
import Ul from './Ul';
import hasSubArray from './utils/hasSubArray';

const MultipleMenuList = ({
  selectProps: { name, onClickAddComponentsToDynamicZone, refState, value },
  ...rest
}) => {
  const { componentsGroupedByCategory } = useDataManager();
  const Component = components.MenuList;
  console.log({ menu: value.value });
  const allComponentsCategory = Object.keys(componentsGroupedByCategory).reduce(
    (acc, current) => {
      const categoryCompos = componentsGroupedByCategory[current].map(compo => {
        return compo.uid;
      });

      acc[current] = categoryCompos;

      return acc;
    },
    {}
  );

  const getCategoryValue = categoryName => {
    const componentsCategory = allComponentsCategory[categoryName];

    return hasSubArray(value.value, componentsCategory);
  };

  const handleChangeCategory = ({ target }) => {
    refState.current.select.blur();
    const dataTarget = {
      name,
      components: allComponentsCategory[target.name],
      shouldAddComponents: target.value,
    };
    onClickAddComponentsToDynamicZone({ target: dataTarget });
  };

  const handleChange = ({ target }) => {
    const dataTarget = {
      name,
      components: target.name,
      shouldAddComponents: target.value,
    };

    onClickAddComponentsToDynamicZone({ target: dataTarget });
  };

  return (
    <Component {...rest}>
      <Ul
        style={{
          maxHeight: 150,
          // overflow: 'scroll',
        }}
      >
        {Object.keys(componentsGroupedByCategory).map(categoryName => {
          const isChecked = getCategoryValue(categoryName);
          const target = { name: categoryName, value: !isChecked };
          return (
            <li key={categoryName}>
              <div>
                <CheckboxWrapper>
                  <Label
                    htmlFor="overrideReactSelectBehaviour"
                    onClick={() => {
                      handleChangeCategory({ target });
                    }}
                  >
                    <Checkbox
                      id="checkCategory"
                      name={categoryName}
                      onChange={handleChangeCategory}
                      checked={getCategoryValue(categoryName)}
                      style={{ marginRight: 10 }}
                    />
                    {categoryName}
                  </Label>
                </CheckboxWrapper>
              </div>
              <Ul>
                {componentsGroupedByCategory[categoryName].map(component => {
                  const isChecked = get(value, 'value', []).includes(
                    component.uid
                  );
                  const target = { name: component.uid, value: !isChecked };

                  return (
                    <li key={component.uid}>
                      <CheckboxWrapper>
                        <Label
                          htmlFor={component.uid}
                          message={component.schema.name}
                          onClick={() => {
                            handleChange({ target });
                          }}
                        >
                          <Checkbox
                            id="check"
                            name={component.uid}
                            onChange={handleChange}
                            checked={isChecked}
                            style={{ marginRight: 10 }}
                          />
                          {component.schema.name}
                        </Label>
                      </CheckboxWrapper>
                    </li>
                  );
                })}
              </Ul>
            </li>
          );
        })}
      </Ul>
    </Component>
  );
};

MultipleMenuList.defaultProps = {
  selectProps: {
    refState: {
      current: {
        select: {
          blur: () => {},
        },
      },
    },
    value: {},
  },
};

MultipleMenuList.propTypes = {
  selectProps: PropTypes.shape({
    name: PropTypes.string.isRequired,
    onClickAddComponentsToDynamicZone: PropTypes.func.isRequired,
    refState: PropTypes.object,
    value: PropTypes.object,
  }).isRequired,
};

export default MultipleMenuList;
