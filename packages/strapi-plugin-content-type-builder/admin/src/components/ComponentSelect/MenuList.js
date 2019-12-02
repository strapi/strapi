import React from 'react';
import PropTypes from 'prop-types';
import { components } from 'react-select';
import { upperFirst } from 'lodash';
import useDataManager from '../../hooks/useDataManager';
import Category from './Category';
import Ul from './Ul';

const MenuList = ({
  selectProps: {
    isAddingAComponentToAnotherComponent,
    name,
    onClickOption,
    refState,
  },
  ...rest
}) => {
  const {
    componentsGroupedByCategory,
    componentsThatHaveOtherComponentInTheirAttributes,
  } = useDataManager();
  const Component = components.MenuList;

  return (
    <Component {...rest}>
      <Ul
        style={{
          maxHeight: 150,
        }}
      >
        {Object.keys(componentsGroupedByCategory).map(categoryName => {
          return (
            <li key={categoryName}>
              <Category categoryName={categoryName} />
              <Ul style={{ marginTop: '-4px' }}>
                {componentsGroupedByCategory[categoryName].map(component => {
                  if (
                    isAddingAComponentToAnotherComponent &&
                    componentsThatHaveOtherComponentInTheirAttributes.includes(
                      component.uid
                    )
                  ) {
                    return null;
                  }

                  return (
                    <li
                      key={component.uid}
                      className="li"
                      // style={{ lineHeight: '18px', maerginBottom: 8 }}
                      onClick={() => {
                        refState.current.select.blur();
                        onClickOption({
                          target: { name, value: component.uid },
                        });
                      }}
                    >
                      <p datadescr={upperFirst(component.schema.name)}>
                        {upperFirst(component.schema.name)}
                      </p>
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

MenuList.defaultProps = {
  selectProps: {
    isAddingAComponentToAnotherComponent: false,
    refState: {
      current: {
        select: {
          blur: () => {},
        },
      },
    },
  },
};

MenuList.propTypes = {
  selectProps: PropTypes.shape({
    isAddingAComponentToAnotherComponent: PropTypes.bool,
    name: PropTypes.string.isRequired,
    onClickOption: PropTypes.func.isRequired,
    refState: PropTypes.object,
  }).isRequired,
};

export default MenuList;
