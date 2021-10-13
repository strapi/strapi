/**
 *
 * List
 *
 */

/* eslint-disable import/no-cycle */
import React from 'react';
import PropTypes from 'prop-types';
import get from 'lodash/get';
import { EmptyBodyTable, useTracking } from '@strapi/helper-plugin';
import { Box } from '@strapi/parts/Box';
import { Button } from '@strapi/parts/Button';
import { TableLabel } from '@strapi/parts/Text';
import { Table, Thead, Tr, Th, TFooter } from '@strapi/parts/Table';
import AddIcon from '@strapi/icons/AddIcon';
import { useIntl } from 'react-intl';
import useListView from '../../hooks/useListView';
import useDataManager from '../../hooks/useDataManager';
import DynamicZoneList from '../DynamicZoneList';
import ComponentList from '../ComponentList';
import BoxWrapper from './BoxWrapper';
import getTrad from '../../utils/getTrad';
import NestedTFooter from '../NestedTFooter';

/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */

function List({
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
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const { isInDevelopmentMode, modifiedData, isInContentTypeView } = useDataManager();

  const { openModalAddField } = useListView();
  const onClickAddField = () => {
    trackUsage('hasClickedCTBAddFieldBanner');
    const firstComponentIcon = get(
      modifiedData,
      ['components', firstLoopComponentUid, 'schema', 'icon'],
      ''
    );
    const firstComponentCategory = get(
      modifiedData,
      ['components', firstLoopComponentUid, 'category'],
      null
    );
    const firstComponentFriendlyName = get(
      modifiedData,
      ['components', firstLoopComponentUid, 'schema', 'name'],
      null
    );
    const secondComponentCategory = get(
      modifiedData,
      ['components', secondLoopComponentUid, 'category'],
      null
    );
    const secondComponentFriendlyName = get(
      modifiedData,
      ['components', secondLoopComponentUid, 'schema', 'name'],
      null
    );
    const secondComponentIcon = get(
      modifiedData,
      ['components', secondLoopComponentUid, 'schema', 'icon'],
      ''
    );
    const headerIconName1 =
      editTarget === 'contentType'
        ? get(modifiedData, ['contentType', 'schema', 'kind'], null)
        : editTarget;

    let firstHeaderObject = {
      header_label_1: mainTypeName,
      header_icon_name_1: headerIconName1,
      header_icon_isCustom_1: false,
      header_info_category_1: null,
      header_info_name_1: null,
    };
    let secondHeaderObject = {
      header_label_2: firstLoopComponentName,
      header_icon_name_2: 'component',
      header_icon_isCustom_2: false,
      header_info_category_2: firstComponentCategory,
      header_info_name_2: firstComponentFriendlyName,
    };
    let thirdHeaderObject = {
      header_icon_name_3: 'component',
      header_icon_isCustom_3: false,
      header_info_category_3: secondComponentCategory,
      header_info_name_3: secondComponentFriendlyName,
    };
    let fourthHeaderObject = {
      header_icon_name_4: null,
      header_icon_isCustom_4: false,
      header_info_category_4: secondComponentCategory,
      header_info_name_4: secondComponentFriendlyName,
    };

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
        header_info_category_2: null,
        header_info_name_2: null,
      };
      thirdHeaderObject = {
        ...thirdHeaderObject,
        header_icon_name_3: isNestedInDZComponent ? 'component' : null,
        header_label_3: firstLoopComponentName,
        header_info_category_3: firstComponentCategory,
        header_info_name_3: firstComponentFriendlyName,
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

  if (!targetUid) {
    return (
      <Table colCount={2} rowCount={2}>
        <Thead>
          <Tr>
            <Th>
              <TableLabel textColor="neutral600">
                {formatMessage({ id: 'table.headers.name', defaultMessage: 'Name' })}
              </TableLabel>
            </Th>
            <Th>
              <TableLabel textColor="neutral600">
                {formatMessage({ id: 'table.headers.type', defaultMessage: 'Type' })}
              </TableLabel>
            </Th>
          </Tr>
        </Thead>
        <EmptyBodyTable
          colSpan={2}
          content={{
            id: getTrad('table.content.create-first-content-type'),
            defaultMessage: 'Create your first Collection-Type',
          }}
        />
      </Table>
    );
  }

  if (items.length === 0 && isMain) {
    return (
      <Table colCount={2} rowCount={2}>
        <Thead>
          <Tr>
            <Th>
              <TableLabel textColor="neutral600">
                {formatMessage({ id: 'table.headers.name', defaultMessage: 'Name' })}
              </TableLabel>
            </Th>
            <Th>
              <TableLabel textColor="neutral600">
                {formatMessage({ id: 'table.headers.type', defaultMessage: 'Type' })}
              </TableLabel>
            </Th>
          </Tr>
        </Thead>
        <EmptyBodyTable
          action={
            <Button onClick={onClickAddField} size="L" startIcon={<AddIcon />} variant="secondary">
              {formatMessage({
                id: getTrad('table.button.no-fields'),
                defaultMessage: 'Add new field',
              })}
            </Button>
          }
          colSpan={2}
          content={
            isInContentTypeView
              ? {
                  id: getTrad('table.content.no-fields.collection-type'),
                  defaultMessage: 'Add your first field to this Collection-Type',
                }
              : {
                  id: getTrad('table.content.no-fields.component'),
                  defaultMessage: 'Add your first field to this component',
                }
          }
        />
      </Table>
    );
  }

  return (
    <>
      <BoxWrapper>
        <Box
          paddingLeft={6}
          paddingRight={isMain ? 6 : 0}
          {...(isMain && { style: { overflowX: 'auto' } })}
        >
          <table>
            {isMain && (
              <thead>
                <tr>
                  <th>
                    <TableLabel textColor="neutral600">
                      {formatMessage({ id: 'table.headers.name', defaultMessage: 'Name' })}
                    </TableLabel>
                  </th>
                  <th colSpan="2">
                    <TableLabel textColor="neutral600">
                      {formatMessage({ id: 'table.headers.type', defaultMessage: 'Type' })}
                    </TableLabel>
                  </th>
                </tr>
              </thead>
            )}
            <tbody>
              {items.map(item => {
                const { type } = item;
                const CustomRow = customRowComponent;

                return (
                  <React.Fragment key={item.name}>
                    <CustomRow
                      {...item}
                      dzName={dzName}
                      isNestedInDZComponent={isNestedInDZComponent}
                      targetUid={targetUid}
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
        </Box>

        {isMain && isInDevelopmentMode && (
          <TFooter icon={<AddIcon />} onClick={onClickAddField}>
            {formatMessage({
              id: getTrad(
                `form.button.add.field.to.${
                  modifiedData.contentType
                    ? modifiedData.contentType.schema.kind
                    : editTarget || 'collectionType'
                }`
              ),
              defaultMessage: 'Add another field',
            })}
          </TFooter>
        )}
        {isSub && isInDevelopmentMode && (
          <NestedTFooter
            icon={<AddIcon />}
            onClick={onClickAddField}
            color={isFromDynamicZone ? 'primary' : 'neutral'}
          >
            {formatMessage({
              id: getTrad(`form.button.add.field.to.component`),
              defaultMessage: 'Add another field',
            })}
          </NestedTFooter>
        )}
      </BoxWrapper>
    </>
  );
}

List.defaultProps = {
  addComponentToDZ: () => {},
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
