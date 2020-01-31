import React from 'react';
import PropTypes from 'prop-types';
import { components } from 'react-select';
import { upperFirst } from 'lodash';
import useDataManager from '../../hooks/useDataManager';
import useQuery from '../../hooks/useQuery';
import Category from './Category';
import Ul from './Ul';

/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */

const MenuList = ({
  selectProps: {
    isAddingAComponentToAnotherComponent,
    name,
    onClickOption,
    refState,
    value,
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
        {Object.keys(componentsGroupedByCategory)
          .sort()
          .map(categoryName => {
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

                    const isSelected = value.value === component.uid;

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
                        <p
                          datadescr={upperFirst(component.schema.name)}
                          style={{
                            color: isSelected ? '#007eff' : '',
                            fontWeight: isSelected ? '700' : '400',
                          }}
                        >
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
    value: {
      value: '',
    },
  },
};

MenuList.propTypes = {
  selectProps: PropTypes.shape({
    isAddingAComponentToAnotherComponent: PropTypes.bool,
    name: PropTypes.string.isRequired,
    onClickOption: PropTypes.func.isRequired,
    refState: PropTypes.object,
    value: PropTypes.object,
  }),
};

export default MenuList;
