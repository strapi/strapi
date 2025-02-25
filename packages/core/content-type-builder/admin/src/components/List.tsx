import { ComponentType, Fragment } from 'react';

import { useTracking } from '@strapi/admin/strapi-admin';
import {
  Box,
  Button,
  EmptyStateLayout,
  Table,
  Tbody,
  Td,
  TFooter,
  Th,
  Thead,
  Tr,
  Typography,
} from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import { EmptyDocuments } from '@strapi/icons/symbols';
import { useIntl } from 'react-intl';

import { getTrad } from '../utils/getTrad';

import { BoxWrapper } from './BoxWrapper';
import { ComponentList } from './ComponentList';
import { useDataManager } from './DataManager/useDataManager';
import { DynamicZoneList } from './DynamicZoneList';
import { useFormModalNavigation } from './FormModalNavigation/useFormModalNavigation';
import { NestedTFooter } from './NestedFooter';

import type { Component, ContentType } from '../types';

type ListProps = {
  addComponentToDZ?: () => void;
  customRowComponent: ComponentType<any>;
  firstLoopComponentUid?: string;
  isFromDynamicZone?: boolean;
  isNestedInDZComponent?: boolean;
  isMain?: boolean;
  secondLoopComponentUid?: string | null;
  isSub?: boolean;
  type: ContentType | Component;
};

export const List = ({
  addComponentToDZ,
  customRowComponent,
  firstLoopComponentUid,
  isFromDynamicZone = false,
  isMain = false,
  isNestedInDZComponent = false,
  isSub = false,
  secondLoopComponentUid,
  type,
}: ListProps) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const { isInDevelopmentMode, isInContentTypeView } = useDataManager();

  const { onOpenModalAddField } = useFormModalNavigation();
  const onClickAddField = () => {
    trackUsage('hasClickedCTBAddFieldBanner');

    onOpenModalAddField({ forTarget: type?.modelType, targetUid: type.uid });
  };

  if (type?.attributes.length === 0 && isMain) {
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
        <Tbody>
          <Tr>
            <Td colSpan={2}>
              <EmptyStateLayout
                action={
                  <Button
                    onClick={onClickAddField}
                    size="L"
                    startIcon={<Plus />}
                    variant="secondary"
                  >
                    {formatMessage({
                      id: getTrad('table.button.no-fields'),
                      defaultMessage: 'Add new field',
                    })}
                  </Button>
                }
                content={formatMessage(
                  isInContentTypeView
                    ? {
                        id: getTrad('table.content.no-fields.collection-type'),
                        defaultMessage: 'Add your first field to this Collection-Type',
                      }
                    : {
                        id: getTrad('table.content.no-fields.component'),
                        defaultMessage: 'Add your first field to this component',
                      }
                )}
                hasRadius
                icon={<EmptyDocuments width="16rem" />}
              />
            </Td>
          </Tr>
        </Tbody>
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
                  <Typography variant="sigma" textColor="neutral800">
                    {formatMessage({ id: 'global.name', defaultMessage: 'Name' })}
                  </Typography>
                </th>
                <th colSpan={2}>
                  <Typography variant="sigma" textColor="neutral800">
                    {formatMessage({ id: 'global.type', defaultMessage: 'Type' })}
                  </Typography>
                </th>
              </tr>
            </thead>
          )}
          <tbody>
            {type?.attributes.map((item: any) => {
              const CustomRow = customRowComponent;

              return (
                <Fragment key={item.name}>
                  <CustomRow
                    {...item}
                    isNestedInDZComponent={isNestedInDZComponent}
                    targetUid={type.uid}
                    editTarget={type.modelType}
                    firstLoopComponentUid={firstLoopComponentUid}
                    isFromDynamicZone={isFromDynamicZone}
                    secondLoopComponentUid={secondLoopComponentUid}
                  />
                  {item.type === 'component' && (
                    <ComponentList
                      {...item}
                      customRowComponent={customRowComponent}
                      isNestedInDZComponent={isFromDynamicZone}
                      firstLoopComponentUid={firstLoopComponentUid}
                    />
                  )}

                  {item.type === 'dynamiczone' && (
                    <DynamicZoneList
                      name={item.name}
                      components={item.components}
                      customRowComponent={customRowComponent}
                      addComponent={addComponentToDZ!}
                      forTarget={type.modelType}
                      targetUid={type.uid}
                    />
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </Box>

      {isMain && isInDevelopmentMode && (
        <TFooter cursor="pointer" icon={<Plus />} onClick={onClickAddField}>
          {formatMessage({
            id: getTrad(
              `form.button.add.field.to.${
                type.modelType === 'component' ? 'component' : type.kind
              }`
            ),
            defaultMessage: 'Add another field',
          })}
        </TFooter>
      )}
      {isSub && isInDevelopmentMode && !isFromDynamicZone && (
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
};
