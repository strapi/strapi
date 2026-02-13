import { forwardRef, memo, useState } from 'react';

import { ConfirmDialog } from '@strapi/admin/strapi-admin';
import { Box, Flex, IconButton, Typography, Link, Badge, Dialog } from '@strapi/design-system';
import { ChevronDown, Drag, Lock, Pencil, Trash } from '@strapi/icons';
import get from 'lodash/get';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';
import { Link as NavLink } from 'react-router-dom';
import { styled } from 'styled-components';

import { Curve } from '../icons/Curve';
import { checkDependentRows } from '../utils/conditions';
import { getAttributeDisplayedType } from '../utils/getAttributeDisplayedType';
import { getRelationType } from '../utils/getRelationType';
import { getTrad } from '../utils/getTrad';

import { AttributeIcon } from './AttributeIcon';
import { ComponentList } from './ComponentList';
import { useDataManager } from './DataManager/useDataManager';
import { DisplayedType } from './DisplayedType';
import { DynamicZoneList } from './DynamicZoneList';
import { useFormModalNavigation } from './FormModalNavigation/useFormModalNavigation';
import { StatusBadge } from './Status';

import type { AnyAttribute, Component, ContentType } from '../types';
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import type { UID } from '@strapi/types';

export const GridWrapper = styled(Flex)<{ $isOverlay?: boolean; $isDragging?: boolean }>`
  justify-content: space-between;

  border-top: ${({ theme, $isOverlay }) =>
    $isOverlay ? 'none' : `1px solid ${theme.colors.neutral150}`};

  padding-top: ${({ theme }) => theme.spaces[4]};
  padding-bottom: ${({ theme }) => theme.spaces[4]};

  opacity: ${({ $isDragging }) => ($isDragging ? 0 : 1)};
  align-items: center;
`;

export type AttributeRowProps = {
  item: {
    id: string;
    index: number;
  } & AnyAttribute;
  firstLoopComponentUid?: UID.Component | null;
  isFromDynamicZone?: boolean;
  addComponentToDZ?: () => void;
  secondLoopComponentUid?: UID.Component | null;
  type: ContentType | Component;
  isDragging?: boolean;
  style?: Record<string, unknown>;
  listeners?: DraggableSyntheticListeners;
  attributes?: DraggableAttributes;
  isOverlay?: boolean;
  handleRef?: (element: HTMLElement | null) => void;
};

const StyledAttributeRow = styled(Box)`
  list-style: none;
  list-style-type: none;
`;

export const AttributeRow = forwardRef<HTMLLIElement, AttributeRowProps>((props, ref) => {
  const { style, ...rest } = props;

  return (
    <StyledAttributeRow
      tag="li"
      ref={ref}
      {...props.attributes}
      style={style}
      background="neutral0"
      shadow={props.isOverlay ? 'filterShadow' : 'none'}
      aria-label={props.item.name}
    >
      <MemoizedRow {...rest} />
    </StyledAttributeRow>
  );
});

const MemoizedRow = memo((props: Omit<AttributeRowProps, 'style'>) => {
  const {
    item,
    firstLoopComponentUid,
    isFromDynamicZone,
    addComponentToDZ,
    secondLoopComponentUid,
    type,
    isDragging,
    isOverlay,
    handleRef,
    listeners,
  } = props;
  const shouldHideNestedInfos = isOverlay || isDragging;

  const [isOpen, setIsOpen] = useState<boolean>(true);

  const isTypeDeleted = type.status === 'REMOVED';

  const { contentTypes, removeAttribute, isInDevelopmentMode } = useDataManager();
  const { onOpenModalEditField, onOpenModalEditCustomField } = useFormModalNavigation();

  const { formatMessage } = useIntl();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const isDeleted = item.status === 'REMOVED';

  const isMorph = item.type === 'relation' && item.relation.includes('morph');
  const ico = ['integer', 'biginteger', 'float', 'decimal'].includes(item.type)
    ? 'number'
    : item.type;

  const targetContentType = item.type === 'relation' ? get(contentTypes, item.target) : null;
  const isPluginContentType = get(targetContentType, 'plugin');

  const src = 'target' in item && item.target ? 'relation' : ico;

  const handleDelete = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    const dependentRows = checkDependentRows(contentTypes, item.name);
    if (dependentRows.length > 0) {
      setShowConfirmDialog(true);
    } else {
      removeAttribute({
        forTarget: type.modelType,
        targetUid: type.uid,
        attributeToRemoveName: item.name,
      });
    }
  };

  const handleConfirmDelete = () => {
    removeAttribute({
      forTarget: type.modelType,
      targetUid: type.uid,
      attributeToRemoveName: item.name,
    });
    setShowConfirmDialog(false);
  };

  const handleCancelDelete = () => {
    setShowConfirmDialog(false);
  };

  const handleClick = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.stopPropagation();
    }

    if (isMorph) {
      return;
    }

    if (item.configurable !== false) {
      const editTargetUid = (secondLoopComponentUid || firstLoopComponentUid || type.uid)!;

      const attributeType = getAttributeDisplayedType(item.type);
      const step = item.type === 'component' ? '2' : null;

      if (item.customField) {
        onOpenModalEditCustomField({
          forTarget: type.modelType,
          targetUid: editTargetUid,
          attributeName: item.name,
          attributeType,
          customFieldUid: item.customField,
        });
      } else {
        onOpenModalEditField({
          forTarget: type.modelType,
          targetUid: editTargetUid,
          attributeName: item.name,
          attributeType,
          step,
        });
      }
    }
  };

  let loopNumber;

  if (secondLoopComponentUid && firstLoopComponentUid) {
    loopNumber = 2;
  } else if (firstLoopComponentUid) {
    loopNumber = 1;
  } else {
    loopNumber = 0;
  }

  const canEdit = !isTypeDeleted && !isDeleted;
  const canDelete = !isTypeDeleted && !isDeleted;

  const cursor = isTypeDeleted || isDeleted ? 'not-allowed' : 'move';

  const canClick = isInDevelopmentMode && item.configurable !== false && !isMorph && canEdit;

  return (
    <>
      <GridWrapper
        $isOverlay={isOverlay}
        $isDragging={isDragging}
        onClick={canClick ? handleClick : undefined}
        paddingLeft={4}
        paddingRight={4}
      >
        <Flex alignItems="center" overflow="hidden" gap={2}>
          {loopNumber !== 0 && !isOverlay && (
            <Curve color={isFromDynamicZone ? 'primary200' : 'neutral150'} />
          )}
          {isInDevelopmentMode && (
            <IconButton
              cursor={cursor}
              role="Handle"
              ref={handleRef}
              {...listeners}
              variant="ghost"
              withTooltip={false}
              label={`${formatMessage({
                id: 'app.utils.drag',
                defaultMessage: 'Drag',
              })} ${item.name}`}
              disabled={isTypeDeleted || isDeleted}
              style={{ outlineOffset: '-2px' }}
            >
              <Drag />
            </IconButton>
          )}
          <Flex gap={4}>
            <Flex gap={4} alignItems="center">
              <AttributeIcon type={src} customField={item.customField} />
              <Typography
                textColor="neutral800"
                fontWeight="bold"
                textDecoration={isDeleted ? 'line-through' : 'none'}
                ellipsis
                overflow="hidden"
              >
                {item.name}
                {'required' in item && item.required && (
                  <Typography textColor="danger600">*&nbsp;</Typography>
                )}
              </Typography>
            </Flex>
            <Flex>
              <Typography textColor="neutral600">
                <DisplayedType
                  type={item.type}
                  customField={item.customField}
                  repeatable={'repeatable' in item && item.repeatable}
                  multiple={'multiple' in item && item.multiple}
                />
                {'conditions' in item &&
                  item.conditions &&
                  Object.keys(item.conditions).length > 0 && <Badge margin={4}>conditional</Badge>}
                {item.type === 'relation' && (
                  <>
                    &nbsp;({getRelationType(item.relation, item.targetAttribute)})&nbsp;
                    {targetContentType &&
                      formatMessage({
                        id: getTrad('modelPage.attribute.with'),
                        defaultMessage: 'with',
                      })}
                    &nbsp;
                    {targetContentType && (
                      <Link
                        onClick={(e) => e.stopPropagation()}
                        tag={NavLink}
                        to={`/plugins/content-type-builder/content-types/${targetContentType.uid}`}
                      >
                        {upperFirst(targetContentType.info.displayName)}
                      </Link>
                    )}
                    {isPluginContentType &&
                      `(${formatMessage({
                        id: getTrad(`from`),
                        defaultMessage: 'from',
                      })}: ${isPluginContentType})`}
                  </>
                )}
                {item.type === 'component' && <ComponentLink uid={item.component} />}
              </Typography>
            </Flex>
          </Flex>
        </Flex>

        <Box>
          <Flex justifyContent="flex-end" gap={1} onClick={(e) => e.stopPropagation()}>
            <>
              <Box>{item.status && <StatusBadge status={item.status} />}</Box>
              {['component', 'dynamiczone'].includes(item.type) && (
                <IconButton
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    if (isOpen) {
                      setIsOpen(false);
                    } else {
                      setIsOpen(true);
                    }
                  }}
                  aria-expanded={isOpen}
                  label={formatMessage({
                    id: 'app.utils.toggle',
                    defaultMessage: 'Toggle',
                  })}
                  variant="ghost"
                  withTooltip={false}
                >
                  <ChevronDown
                    aria-hidden
                    fill="neutral500"
                    style={{
                      transform: `rotate(${isOpen ? '0deg' : '-90deg'})`,
                      transition: 'transform 0.5s',
                    }}
                  />
                </IconButton>
              )}
              {isInDevelopmentMode && item.configurable !== false ? (
                <>
                  {!isMorph && (
                    <IconButton
                      onClick={handleClick}
                      label={`${formatMessage({
                        id: 'app.utils.edit',
                        defaultMessage: 'Edit',
                      })} ${item.name}`}
                      variant="ghost"
                      disabled={!canEdit}
                    >
                      <Pencil />
                    </IconButton>
                  )}
                  <IconButton
                    onClick={handleDelete}
                    label={`${formatMessage({
                      id: 'global.delete',
                      defaultMessage: 'Delete',
                    })} ${item.name}`}
                    variant="ghost"
                    disabled={!canDelete}
                  >
                    <Trash />
                  </IconButton>
                  <Dialog.Root open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                    <ConfirmDialog onConfirm={handleConfirmDelete} onCancel={handleCancelDelete}>
                      <Box>
                        <Typography>
                          {formatMessage({
                            id: getTrad(
                              'popUpWarning.bodyMessage.delete-attribute-with-conditions'
                            ),
                            defaultMessage:
                              'The following fields have conditions that depend on this field: ',
                          })}
                          <Typography fontWeight="bold">
                            {checkDependentRows(contentTypes, item.name)
                              .map(({ attribute }) => attribute)
                              .join(', ')}
                          </Typography>
                          {formatMessage({
                            id: getTrad(
                              'popUpWarning.bodyMessage.delete-attribute-with-conditions-end'
                            ),
                            defaultMessage: '. Are you sure you want to delete it?',
                          })}
                        </Typography>
                      </Box>
                    </ConfirmDialog>
                  </Dialog.Root>
                </>
              ) : (
                <Flex padding={2}>
                  <Lock fill="neutral500" />
                </Flex>
              )}
            </>
          </Flex>
        </Box>
      </GridWrapper>

      <SubRow $shouldHideNestedInfos={shouldHideNestedInfos} $isOpen={isOpen}>
        {item.type === 'component' && (
          <ComponentList
            {...item}
            isFromDynamicZone={isFromDynamicZone}
            firstLoopComponentUid={firstLoopComponentUid}
          />
        )}

        {item.type === 'dynamiczone' && (
          <DynamicZoneList
            {...item}
            disabled={isTypeDeleted || item.status === 'REMOVED'}
            addComponent={addComponentToDZ!}
            forTarget={type.modelType}
            targetUid={type.uid}
          />
        )}
      </SubRow>
    </>
  );
});

const SubRow = styled(Box)<{ $isOpen: boolean; $shouldHideNestedInfos?: boolean }>`
  display: ${({ $shouldHideNestedInfos }) => ($shouldHideNestedInfos ? 'none' : 'block')};
  max-height: ${({ $isOpen }) => ($isOpen ? '9999px' : '0px')};
  overflow: hidden;

  transition: ${({ $isOpen }) =>
    $isOpen ? 'max-height 1s ease-in-out' : 'max-height 0.5s cubic-bezier(0, 1, 0, 1)'};
`;

const ComponentLink = ({ uid }: { uid: UID.Component }) => {
  const { components } = useDataManager();
  const type = get(components, uid);

  return (
    <>
      &nbsp;(
      <Link
        onClick={(e) => e.stopPropagation()}
        tag={NavLink}
        to={`/plugins/content-type-builder/component-categories/${type.category}/${type.uid}`}
      >
        {upperFirst(type.info.displayName)}
      </Link>
      )
    </>
  );
};
