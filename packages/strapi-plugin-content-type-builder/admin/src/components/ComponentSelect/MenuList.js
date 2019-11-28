import React from 'react';
import PropTypes from 'prop-types';
import { components } from 'react-select';
import useDataManager from '../../hooks/useDataManager';

const MenuList = ({
  selectProps: { name, onClickOption, refState },
  ...rest
}) => {
  const { componentsGroupedByCategory } = useDataManager();
  const Component = components.MenuList;

  return (
    <Component {...rest}>
      <ul
        style={{
          backgroundColor: '#fff',
          maxHeight: 150,
          // overflow: 'scroll',
        }}
      >
        {Object.keys(componentsGroupedByCategory).map(categoryName => {
          return (
            <li key={categoryName}>
              {categoryName}
              <ul>
                {componentsGroupedByCategory[categoryName].map(component => {
                  return (
                    <li
                      key={component.uid}
                      onClick={() => {
                        refState.current.select.blur();
                        onClickOption({
                          target: { name, value: component.uid },
                        });
                      }}
                    >
                      {component.schema.name}
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </Component>
  );
};

MenuList.defaultProps = {
  selectProps: {
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
    name: PropTypes.string.isRequired,
    onClickOption: PropTypes.func.isRequired,
    refState: PropTypes.object,
  }).isRequired,
};

export default MenuList;
