import React from 'react';
import PropTypes from 'prop-types';
import { components } from 'react-select';
import { upperFirst } from 'lodash';
import useDataManager from '../../hooks/useDataManager';
import useQuery from '../../hooks/useQuery';
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

  const query = useQuery();
  const Component = components.MenuList;
  const forTarget = query.get('forTarget');
  const uid = query.get('targetUid');
  const isTargetAComponent = ['component', 'components'].includes(forTarget);

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
                    (isAddingAComponentToAnotherComponent &&
                      componentsThatHaveOtherComponentInTheirAttributes.includes(
                        component.uid
                      )) ||
                    (isTargetAComponent && component.uid === uid)
                  ) {
                    return null;
                  }

                  return (
                    <li
                      key={component.uid}
                      className="li"
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
