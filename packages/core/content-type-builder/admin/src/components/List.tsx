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

import { useDataManager } from '../hooks/useDataManager';
import { useFormModalNavigation } from '../hooks/useFormModalNavigation';
import { getTrad } from '../utils/getTrad';

import { BoxWrapper } from './BoxWrapper';
import { ComponentList } from './ComponentList';
import { DynamicZoneList } from './DynamicZoneList';
import { NestedTFooter } from './NestedFooter';

import type { Internal } from '@strapi/types';

type ListProps = {
  addComponentToDZ?: () => void;
  customRowComponent: ComponentType<any>;
  firstLoopComponentUid?: string;
  isFromDynamicZone?: boolean;
  isNestedInDZComponent?: boolean;
  isMain?: boolean;
  items: any[];
  secondLoopComponentUid?: string | null;
  isSub?: boolean;
} & (
  | {
      addComponentToDZ?: () => void;
      editTarget: 'component' | 'components';
      targetUid: Internal.UID.Component;
    }
  | {
      editTarget: 'contentType';
      targetUid: Internal.UID.ContentType;
    }
);

export const List = ({
  addComponentToDZ,
  customRowComponent,
  editTarget,
  firstLoopComponentUid,
  isFromDynamicZone = false,
  isMain = false,
  isNestedInDZComponent = false,
  isSub = false,
  items = [],
  secondLoopComponentUid,
  targetUid,
}: ListProps) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const { isInDevelopmentMode, isInContentTypeView, components, contentTypes } = useDataManager();

  const type =
    editTarget === 'component' || editTarget === 'components'
      ? components[targetUid]
      : contentTypes[targetUid];

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
        <Tbody>
          <Tr>
            <Td colSpan={2}>
              <EmptyStateLayout
                content={formatMessage({
                  id: getTrad('table.content.create-first-content-type'),
                  defaultMessage: 'Create your first Collection-Type',
                })}
                hasRadius
                icon={<EmptyDocuments width="16rem" />}
              />
            </Td>
          </Tr>
        </Tbody>
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
            {items.map((item) => {
              const { type } = item;
              const CustomRow = customRowComponent;

              return (
                <Fragment key={item.name}>
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
                      isNestedInDZComponent={isFromDynamicZone}
                      firstLoopComponentUid={firstLoopComponentUid}
                    />
                  )}

                  {type === 'dynamiczone' && (
                    <DynamicZoneList
                      name={item.name}
                      components={item.components}
                      customRowComponent={customRowComponent}
                      addComponent={addComponentToDZ!}
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
                editTarget === 'component' || editTarget === 'components'
                  ? 'component'
                  : type?.schema.kind
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
