/**
 *
 * List
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useGlobalContext } from 'strapi-helper-plugin';
import { Plus } from '@buffetjs/icons';

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
  removeComponentFromDZ,
  isSub,
}) {
  const { formatMessage } = useGlobalContext();
  const addButtonProps = {
    icon: !isSub ? true : false,
    color: 'primary',
    label: formatMessage({
      id: !isSub
        ? `${pluginId}.form.button.add.field.to.contentType`
        : `${pluginId}.form.button.add.field.to.component`,
    }),
    onClick: () => addField(),
  };

  return (
    <>
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
                      removeComponent={removeComponentFromDZ}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        <ListButton {...addButtonProps}></ListButton>
      </Wrapper>
      {isSub && (
        <div className="plus-icon">
          <Plus fill="#b4b6ba" />
        </div>
      )}
    </>
  );
}

List.defaultProps = {
  addField: () => {},
  addComponentToDZ: () => {},
  className: null,
  customRowComponent: null,
  items: [],
  isSub: false,
  removeComponentFromDZ: () => {},
};

List.propTypes = {
  addField: PropTypes.func,
  addComponentToDZ: PropTypes.func,
  className: PropTypes.string,
  customRowComponent: PropTypes.func,
  items: PropTypes.instanceOf(Array),
  isSub: PropTypes.bool,
  removeComponentFromDZ: PropTypes.func,
};

export default List;
