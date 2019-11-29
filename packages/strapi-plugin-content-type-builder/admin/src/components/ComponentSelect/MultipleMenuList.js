import React from 'react';
import PropTypes from 'prop-types';
import { components } from 'react-select';
import { get, upperFirst } from 'lodash';

import { Checkbox, CheckboxWrapper, Label } from '@buffetjs/styles';
import useDataManager from '../../hooks/useDataManager';
import Ul from './Ul';
import hasSubArray from './utils/hasSubArray';

const MultipleMenuList = ({
  selectProps: { name, addComponentsToDynamicZone, refState, value },
  ...rest
}) => {
  const { componentsGroupedByCategory } = useDataManager();
  const Component = components.MenuList;

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
    addComponentsToDynamicZone({ target: dataTarget });
  };

  const handleChange = ({ target }) => {
    const dataTarget = {
      name,
      components: target.name,
      shouldAddComponents: target.value,
    };

    addComponentsToDynamicZone({ target: dataTarget });
  };

  return (
    <Component {...rest}>
      <Ul
        style={{
          maxHeight: 150,
        }}
      >
        {Object.keys(componentsGroupedByCategory).map(categoryName => {
          const isChecked = getCategoryValue(categoryName);
          const target = { name: categoryName, value: !isChecked };
          return (
            <li key={categoryName}>
              <div style={{ marginTop: 3 }}>
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
                    {upperFirst(categoryName)}
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
    addComponentsToDynamicZone: PropTypes.func.isRequired,
    name: PropTypes.string.isRequired,
    refState: PropTypes.object,
    value: PropTypes.object,
  }).isRequired,
};

export default MultipleMenuList;
