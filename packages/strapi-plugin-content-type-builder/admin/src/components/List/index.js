/**
 *
 * List
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { useGlobalContext } from 'strapi-helper-plugin';
import { Plus } from '@buffetjs/icons';

import pluginId from '../../pluginId';
import useListView from '../../hooks/useListView';
import useDataManager from '../../hooks/useDataManager';
import DynamicZoneList from '../DynamicZoneList';
import ComponentList from '../ComponentList';
import { ListButton } from '../ListButton';
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
  isNestedInDZComponent,
  isMain,
  firstLoopComponentName,
  firstLoopComponentUid,
  secondLoopComponentName,
  secondLoopComponentUid,
  isSub,
  dzName,
}) {
  const { formatMessage } = useGlobalContext();
  const { isInDevelopmentMode, modifiedData } = useDataManager();
  const { openModalAddField } = useListView();
  // console.log({ modifiedData });
  const onClickAddField = () => {
    let firstHeaderObject = {
      header_label_1: mainTypeName,
      header_icon_name_1: 'contentType',
      header_icon_isCustom_1: false,
      header_info_category_1: null,
      header_info_name_1: null,
    };
    let secondHeaderObject = {
      header_label_2: firstLoopComponentName,
      header_icon_name_2: 'component',
      header_icon_isCustom_2: false,
      header_info_category_2: null,
      header_info_name_2: null,
    };
    let thirdHeaderObject = {
      header_icon_name_3: 'component',
      header_icon_isCustom_3: false,
      header_info_category_3: null,
      header_info_name_3: null,
    };
    let fourthHeaderObject = {
      header_icon_name_4: null,
      header_icon_isCustom_4: false,
      header_info_category_4: null,
      header_info_name_4: null,
    };

    const firstComponentIcon = get(
      modifiedData,
      ['components', firstLoopComponentUid, 'schema', 'icon'],
      ''
    );
    const secondComponentIcon = get(
      modifiedData,
      ['components', secondLoopComponentUid, 'schema', 'icon'],
      ''
    );

    if (firstLoopComponentName) {
      firstHeaderObject = {
        ...firstHeaderObject,
        header_icon_name_1: firstComponentIcon,
        header_icon_isCustom_1: true,
      };
    }

    if (secondLoopComponentUid) {
      firstHeaderObject = {
        ...firstHeaderObject,
        header_icon_name_1: secondComponentIcon,
        header_icon_isCustom_1: true,
      };
      thirdHeaderObject = {
        ...thirdHeaderObject,
        header_label_3: secondLoopComponentName,
      };
    }

    if (isFromDynamicZone || isNestedInDZComponent) {
      secondHeaderObject = {
        ...secondHeaderObject,
        header_label_2: dzName,
        header_icon_name_2: 'dynamiczone',
        header_icon_isCustom_2: false,
      };
      thirdHeaderObject = {
        ...thirdHeaderObject,
        header_label_3: firstLoopComponentName,
      };
      fourthHeaderObject = {
        ...fourthHeaderObject,
        header_label_4: secondLoopComponentName,
      };
    }

    openModalAddField(
      editTarget,
      targetUid,
      firstHeaderObject,
      secondHeaderObject,
      thirdHeaderObject,
      fourthHeaderObject
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
                      dzName={dzName}
                      isNestedInDZComponent={isFromDynamicZone}
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
          <ListButton {...addButtonProps}></ListButton>
        )}
        {!isMain && <ListButton {...addButtonProps}></ListButton>}
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
  dzName: null,
  firstLoopComponentName: null,
  firstLoopComponentUid: null,
  isFromDynamicZone: false,
  isNestedInDZComponent: false,
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
  dzName: PropTypes.string,
  editTarget: PropTypes.string.isRequired,
  firstLoopComponentName: PropTypes.string,
  firstLoopComponentUid: PropTypes.string,
  isFromDynamicZone: PropTypes.bool,
  isNestedInDZComponent: PropTypes.bool,
  isMain: PropTypes.bool,
  items: PropTypes.instanceOf(Array),
  mainTypeName: PropTypes.string.isRequired,
  secondLoopComponentName: PropTypes.string,
  secondLoopComponentUid: PropTypes.string,
  targetUid: PropTypes.string,
  isSub: PropTypes.bool,
};

export default List;
