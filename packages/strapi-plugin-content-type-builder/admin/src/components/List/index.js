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
  targetUid,

  mainTypeName,
  editTarget,
  firstLoopComponentName,
  firstLoopComponentUid,
  secondLoopComponentName,
  secondLoopComponentUid,
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

            const CustomRow = customRowComponent;

            return (
              <React.Fragment key={JSON.stringify(item)}>
                <CustomRow
                  {...item}
                  targetUid={targetUid}
                  // NEW props
                  mainTypeName={mainTypeName}
                  editTarget={editTarget}
                  firstLoopComponentName={firstLoopComponentName}
                  firstLoopComponentUid={firstLoopComponentUid}
                  secondLoopComponentName={secondLoopComponentName}
                  secondLoopComponentUid={secondLoopComponentUid}
                />

                {type === 'component' && (
                  <ComponentList
                    {...item}
                    // mainDataType={dataType}
                    // mainDataTypeName={dataTypeName}
                    customRowComponent={customRowComponent}
                    targetUid={targetUid}
                    // NEW PROPS

                    mainTypeName={mainTypeName}
                    editTarget={editTarget}
                    firstLoopComponentName={firstLoopComponentName}
                    firstLoopComponentUid={firstLoopComponentUid}
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

  firstLoopComponentName: null,
  firstLoopComponentUid: null,
  secondLoopComponentName: null,
  secondLoopComponentUid: null,
};

List.propTypes = {
  addField: PropTypes.func,
  addComponentToDZ: PropTypes.func,
  className: PropTypes.string,
  customRowComponent: PropTypes.func,
  // dataType: PropTypes.string.isRequired,
  // dataTypeName: PropTypes.string.isRequired,
  editTarget: PropTypes.string.isRequired,
  firstLoopComponentName: PropTypes.string,
  firstLoopComponentUid: PropTypes.string,
  items: PropTypes.instanceOf(Array),
  mainTypeName: PropTypes.string.isRequired,
  secondLoopComponentName: PropTypes.string,
  secondLoopComponentUid: PropTypes.string,
  targetUid: PropTypes.string.isRequired,
};

export default List;
