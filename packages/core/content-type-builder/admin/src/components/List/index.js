/**
 *
 * List
 *
 */

/* eslint-disable import/no-cycle */
import React from 'react';
import PropTypes from 'prop-types';
import { EmptyBodyTable, useTracking } from '@strapi/helper-plugin';
import { Box } from '@strapi/design-system/Box';
import { Button } from '@strapi/design-system/Button';
import { Typography } from '@strapi/design-system/Typography';
import { Table, Thead, Tr, Th, TFooter } from '@strapi/design-system/Table';
import Plus from '@strapi/icons/Plus';
import { useIntl } from 'react-intl';
import useFormModalNavigation from '../../hooks/useFormModalNavigation';
import useDataManager from '../../hooks/useDataManager';
import DynamicZoneList from '../DynamicZoneList';
import ComponentList from '../ComponentList';
import BoxWrapper from './BoxWrapper';
import getTrad from '../../utils/getTrad';
import NestedTFooter from '../NestedTFooter';

/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */

function List({
  addComponentToDZ,
  customRowComponent,
  editTarget,
  firstLoopComponentUid,
  isFromDynamicZone,
  isMain,
  isNestedInDZComponent,
  isSub,
  items,
  secondLoopComponentUid,
  targetUid,
}) {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const { isInDevelopmentMode, modifiedData, isInContentTypeView } = useDataManager();

  const { onOpenModalAddField } = useFormModalNavigation();
  const onClickAddField = () => {
    trackUsage('hasClickedCTBAddFieldBanner');

    onOpenModalAddField({ forTarget: editTarget, targetUid });
  };

  if (!targetUid) {
    return (
      <Table colCount={2} rowCount={2}>
        <Thead>
          <Tr>
            <Th>
              <Typography variant="sigma" textColor="neutral600">
                {formatMessage({ id: 'global.name', defaultMessage: 'Name' })}
              </Typography>
            </Th>
            <Th>
              <Typography variant="sigma" textColor="neutral600">
                {formatMessage({ id: 'global.type', defaultMessage: 'Type' })}
              </Typography>
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
              <Typography variant="sigma" textColor="neutral600">
                {formatMessage({ id: 'global.name', defaultMessage: 'Name' })}
              </Typography>
            </Th>
            <Th>
              <Typography variant="sigma" textColor="neutral600">
                {formatMessage({ id: 'global.type', defaultMessage: 'Type' })}
              </Typography>
            </Th>
          </Tr>
        </Thead>
        <EmptyBodyTable
          action={
            <Button onClick={onClickAddField} size="L" startIcon={<Plus />} variant="secondary">
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
                  <Typography variant="sigma" textColor="neutral600">
                    {formatMessage({ id: 'global.name', defaultMessage: 'Name' })}
                  </Typography>
                </th>
                <th colSpan="2">
                  <Typography variant="sigma" textColor="neutral600">
                    {formatMessage({ id: 'global.type', defaultMessage: 'Type' })}
                  </Typography>
                </th>
              </tr>
            </thead>
          )}
          <tbody>
            {items.map((item) => {
              const { type } = item;
              const CustomRow = customRowComponent;

              return (
                <React.Fragment key={item.name}>
                  <CustomRow
                    {...item}
                    isNestedInDZComponent={isNestedInDZComponent}
                    targetUid={targetUid}
                    editTarget={editTarget}
                    firstLoopComponentUid={firstLoopComponentUid}
                    isFromDynamicZone={isFromDynamicZone}
                    secondLoopComponentUid={secondLoopComponentUid}
                  />

                  {type === 'component' && (
                    <ComponentList
                      {...item}
                      customRowComponent={customRowComponent}
                      targetUid={targetUid}
                      isNestedInDZComponent={isFromDynamicZone}
                      editTarget={editTarget}
                      firstLoopComponentUid={firstLoopComponentUid}
                    />
                  )}

                  {type === 'dynamiczone' && (
                    <DynamicZoneList
                      {...item}
                      customRowComponent={customRowComponent}
                      addComponent={addComponentToDZ}
                      targetUid={targetUid}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </Box>

      {isMain && isInDevelopmentMode && (
        <TFooter icon={<Plus />} onClick={onClickAddField}>
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
          icon={<Plus />}
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
  );
}

List.defaultProps = {
  addComponentToDZ() {},
  customRowComponent: null,
  firstLoopComponentUid: null,
  isFromDynamicZone: false,
  isNestedInDZComponent: false,
  isMain: false,
  isSub: false,
  items: [],
  secondLoopComponentUid: null,
  targetUid: null,
};

List.propTypes = {
  addComponentToDZ: PropTypes.func,
  customRowComponent: PropTypes.func,
  editTarget: PropTypes.string.isRequired,
  firstLoopComponentUid: PropTypes.string,
  isFromDynamicZone: PropTypes.bool,
  isNestedInDZComponent: PropTypes.bool,
  isMain: PropTypes.bool,
  items: PropTypes.instanceOf(Array),
  secondLoopComponentUid: PropTypes.string,
  targetUid: PropTypes.string,
  isSub: PropTypes.bool,
};

export default List;
