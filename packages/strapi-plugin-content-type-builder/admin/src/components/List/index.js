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
import useListView from '../../hooks/useListView';

import DynamicZoneList from '../DynamicZoneList';
import ComponentList from '../ComponentList';
import Wrapper from './List';
import { ListButton } from '../ListButton';

function List({
  className,
  customRowComponent,
  items,
  addComponentToDZ,
  targetUid,
  mainTypeName,
  editTarget,
  firstLoopComponentName,
  firstLoopComponentUid,
  secondLoopComponentName,
  secondLoopComponentUid,
  isSub,
}) {
  const { formatMessage } = useGlobalContext();
  const { openModalAddField } = useListView();
  const addButtonProps = {
    icon: !isSub ? true : false,
    color: 'primary',
    label: formatMessage({
      id: !isSub
        ? `${pluginId}.form.button.add.field.to.contentType`
        : `${pluginId}.form.button.add.field.to.component`,
    }),
    onClick: () => {
      let headerDisplayName = mainTypeName;

      if (firstLoopComponentName) {
        headerDisplayName = firstLoopComponentName;
      }

      if (secondLoopComponentUid) {
        headerDisplayName = secondLoopComponentName;
      }

      openModalAddField(
        editTarget,
        targetUid,
        headerDisplayName,
        firstLoopComponentUid ? mainTypeName : null,
        secondLoopComponentName ? firstLoopComponentName : null,
        secondLoopComponentUid ? firstLoopComponentUid : null
      );
    },
  };

  if (!targetUid) {
    return null;
  }

  return (
    <>
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
                      targetUid={targetUid}
                      mainTypeName={mainTypeName}
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

  firstLoopComponentName: null,
  firstLoopComponentUid: null,
  isSub: false,
  items: [],
  secondLoopComponentName: null,
  secondLoopComponentUid: null,
  targetUid: null,
};

List.propTypes = {
  addComponentToDZ: PropTypes.func,
  className: PropTypes.string,
  customRowComponent: PropTypes.func,
  editTarget: PropTypes.string.isRequired,
  firstLoopComponentName: PropTypes.string,
  firstLoopComponentUid: PropTypes.string,
  items: PropTypes.instanceOf(Array),
  mainTypeName: PropTypes.string.isRequired,
  secondLoopComponentName: PropTypes.string,
  secondLoopComponentUid: PropTypes.string,
  targetUid: PropTypes.string,
  isSub: PropTypes.bool,
};

export default List;
