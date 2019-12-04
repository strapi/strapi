/**
 *
 * List
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

import DynamicZoneList from '../DynamicZoneList';
import ComponentList from '../ComponentList';
import Wrapper from './List';

/* eslint-disable */
function List({ className, customRowComponent, items }) {
  const renderComponentList = attribute => {
    return (
      <ComponentList {...attribute} customRowComponent={customRowComponent} />
    );
  };

  const renderDynamicZoneList = attribute => {
    return (
      <DynamicZoneList {...attribute} customRowComponent={customRowComponent} />
    );
  };

  return (
    <Wrapper className={className}>
      <table>
        <tbody>
          {items.map(item => {
            const { type } = item;
            return (
              <React.Fragment key={JSON.stringify(item)}>
                {customRowComponent(item)}

                {type === 'component' &&
                  renderComponentList({
                    ...item,
                  })}

                {type === 'dynamiczone' &&
                  renderDynamicZoneList({
                    ...item,
                  })}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </Wrapper>
  );
}

List.defaultProps = {
  className: null,
  customRowComponent: null,
  items: [],
};

List.propTypes = {
  className: PropTypes.string,
  customRowComponent: PropTypes.func,
  items: PropTypes.instanceOf(Array),
};

export default List;
