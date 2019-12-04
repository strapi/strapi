/**
 *
 * List
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useGlobalContext } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';

import DynamicZoneList from '../DynamicZoneList';
import ComponentList from '../ComponentList';
import Wrapper from './List';
import { ListButton } from '../ListButton';

function List({
  className,
  customRowComponent,
  items,
  addField,
  addComponentToDZ,
}) {
  const { formatMessage } = useGlobalContext();
  const addButtonProps = {
    icon: true,
    color: 'primary',
    label: formatMessage({ id: `${pluginId}.button.attributes.add.another` }),
    onClick: () => addField(),
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

                {type === 'component' && (
                  <ComponentList
                    {...item}
                    customRowComponent={customRowComponent}
                  />
                )}

                {type === 'dynamiczone' && (
                  <DynamicZoneList
                    {...item}
                    customRowComponent={customRowComponent}
                    addComponent={addComponentToDZ}
                  />
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      <ListButton {...addButtonProps}></ListButton>
    </Wrapper>
  );
}

List.defaultProps = {
  addField: () => {},
  addComponentToDZ: () => {},
  className: null,
  customRowComponent: null,
  items: [],
};

List.propTypes = {
  addField: PropTypes.func,
  addComponentToDZ: PropTypes.func,
  className: PropTypes.string,
  customRowComponent: PropTypes.func,
  items: PropTypes.instanceOf(Array),
};

export default List;
