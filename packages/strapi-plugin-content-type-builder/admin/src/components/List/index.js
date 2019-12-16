/**
 *
 * List
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useGlobalContext, ListButton } from 'strapi-helper-plugin';
import { Button } from '@buffetjs/core';
import { Plus } from '@buffetjs/icons';

import pluginId from '../../pluginId';
import useListView from '../../hooks/useListView';
import useDataManager from '../../hooks/useDataManager';
import DynamicZoneList from '../DynamicZoneList';
import ComponentList from '../ComponentList';
import Wrapper from './List';

function List({
  className,
  customRowComponent,
  items,
  addComponentToDZ,
  targetUid,
  mainTypeName,
  editTarget,
  isFromDynamicZone,
  isMain,
  firstLoopComponentName,
  firstLoopComponentUid,
  secondLoopComponentName,
  secondLoopComponentUid,
  isSub,
}) {
  const { formatMessage } = useGlobalContext();
  const { isInDevelopmentMode } = useDataManager();
  const { openModalAddField } = useListView();
  const onClickAddField = () => {
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
  };

  const addButtonProps = {
    icon: !isSub ? <Plus fill="#007eff" width="11px" height="11px" /> : false,
    color: 'primary',
    label: isInDevelopmentMode
      ? formatMessage({
          id: !isSub
            ? `${pluginId}.form.button.add.field.to.${editTarget}`
            : `${pluginId}.form.button.add.field.to.component`,
        })
      : null,
    onClick: onClickAddField,
  };

  if (!targetUid) {
    return null;
  }

  return (
    <>
      <Wrapper className={className} isFromDynamicZone={isFromDynamicZone}>
        <table>
          <tbody>
            {items.map(item => {
              const { type } = item;
              const CustomRow = customRowComponent;

              return (
                <React.Fragment key={item.name}>
                  <CustomRow
                    {...item}
                    targetUid={targetUid}
                    // NEW props
                    mainTypeName={mainTypeName}
                    editTarget={editTarget}
                    firstLoopComponentName={firstLoopComponentName}
                    firstLoopComponentUid={firstLoopComponentUid}
                    isFromDynamicZone={isFromDynamicZone}
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
        {isMain && isInDevelopmentMode && (
          <ListButton>
            <Button {...addButtonProps} />
          </ListButton>
        )}
        {!isMain && (
          <ListButton>
            <Button {...addButtonProps} />
          </ListButton>
        )}
      </Wrapper>
      {isSub && (
        <div className="plus-icon" onClick={onClickAddField}>
          {isInDevelopmentMode && (
            <Plus fill={isFromDynamicZone ? '#007EFF' : '#b4b6ba'} />
          )}
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
  isFromDynamicZone: false,
  isMain: false,
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
  isFromDynamicZone: PropTypes.bool,
  isMain: PropTypes.bool,
  items: PropTypes.instanceOf(Array),
  mainTypeName: PropTypes.string.isRequired,
  secondLoopComponentName: PropTypes.string,
  secondLoopComponentUid: PropTypes.string,
  targetUid: PropTypes.string,
  isSub: PropTypes.bool,
};

export default List;
