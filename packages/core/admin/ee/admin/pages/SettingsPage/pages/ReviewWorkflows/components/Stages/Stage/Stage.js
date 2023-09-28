import * as React from 'react';

import {
  Accordion,
  AccordionContent,
  AccordionToggle,
  Box,
  Flex,
  Grid,
  GridItem,
  IconButton,
  MultiSelect,
  MultiSelectGroup,
  MultiSelectOption,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import { Menu, MenuItem } from '@strapi/design-system/v2';
import {
  ConfirmDialog,
  useNotification,
  NotAllowedInput,
  useTracking,
} from '@strapi/helper-plugin';
import { Duplicate, Drag, More } from '@strapi/icons';
import { useField } from 'formik';
import PropTypes from 'prop-types';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';

import { useDragAndDrop } from '../../../../../../../../../admin/src/content-manager/hooks';
import { composeRefs } from '../../../../../../../../../admin/src/content-manager/utils';
import {
  cloneStage,
  deleteStage,
  updateStage,
  updateStagePosition,
  updateStages,
} from '../../../actions';
import { DRAG_DROP_TYPES } from '../../../constants';
import { selectRoles } from '../../../selectors';
import { getAvailableStageColors, getStageColorByHex } from '../../../utils/colors';

const NestedOption = styled(MultiSelectOption)`
  padding-left: ${({ theme }) => theme.spaces[7]};
`;

// Grow the size of the permission Select
const PermissionWrapper = styled(Flex)`
  > * {
    flex-grow: 1;
  }
`;

const DeleteMenuItem = styled(MenuItem)`
  color: ${({ theme }) => theme.colors.danger600};
`;

// Removing the font-size from the child-span aligns the
// more icon vertically
const ContextMenuTrigger = styled(Menu.Trigger)`
  :hover,
  :focus {
    background-color: ${({ theme }) => theme.colors.neutral100};
  }

  > span {
    font-size: 0;
  }
`;

// As soon as either `as` or `forwardedAs` is set, the component
// resets some styles and e.g. the `hasBorder` prop no longer works,
// which is why this bit of CSS has been added manually ¯\_(ツ)_/¯
const DragIconButton = styled(IconButton)`
  align-items: center;
  border-radius: ${({ theme }) => theme.borderRadius};
  display: flex;
  justify-content: center;

  :hover,
  :focus {
    background-color: ${({ theme }) => theme.colors.neutral100};
  }

  svg {
    height: auto;
    width: ${({ theme }) => theme.spaces[3]}};
  }
`;

const AVAILABLE_COLORS = getAvailableStageColors();

function StageDropPreview() {
  return (
    <Box
      background="primary100"
      borderStyle="dashed"
      borderColor="primary600"
      borderWidth="1px"
      display="block"
      hasRadius
      padding={6}
      shadow="tableShadow"
    />
  );
}

export function Stage({
  id,
  index,
  canDelete,
  canReorder,
  canUpdate,
  isOpen: isOpenDefault = false,
  stagesCount,
}) {
  /**
   *
   * @param {number} index
   * @returns {string}
   */
  const getItemPos = (index) => `${index + 1} of ${stagesCount}`;

  /**
   *
   * @param {number} index
   * @returns {void}
   */
  const handleGrabStage = (index) => {
    setLiveText(
      formatMessage(
        {
          id: 'dnd.grab-item',
          defaultMessage: `{item}, grabbed. Current position in list: {position}. Press up and down arrow to change position, Spacebar to drop, Escape to cancel.`,
        },
        {
          item: nameField.value,
          position: getItemPos(index),
        }
      )
    );
  };

  /**
   *
   * @param {number} index
   * @returns {void}
   */
  const handleDropStage = (index) => {
    setLiveText(
      formatMessage(
        {
          id: 'dnd.drop-item',
          defaultMessage: `{item}, dropped. Final position in list: {position}.`,
        },
        {
          item: nameField.value,
          position: getItemPos(index),
        }
      )
    );
  };

  /**
   *
   * @param {number} index
   * @returns {void}
   */
  const handleCancelDragStage = () => {
    setLiveText(
      formatMessage(
        {
          id: 'dnd.cancel-item',
          defaultMessage: '{item}, dropped. Re-order cancelled.',
        },
        {
          item: nameField.value,
        }
      )
    );
  };

  const handleMoveStage = (newIndex, oldIndex) => {
    setLiveText(
      formatMessage(
        {
          id: 'dnd.reorder',
          defaultMessage: '{item}, moved. New position in list: {position}.',
        },
        {
          item: nameField.value,
          position: getItemPos(newIndex),
        }
      )
    );

    dispatch(updateStagePosition(oldIndex, newIndex));
  };

  const handleApplyPermissionsToAllStages = () => {
    setIsApplyAllConfirmationOpen(true);
  };

  const [liveText, setLiveText] = React.useState(null);
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const dispatch = useDispatch();
  const toggleNotification = useNotification();
  const [isOpen, setIsOpen] = React.useState(isOpenDefault);
  const [isApplyAllConfirmationOpen, setIsApplyAllConfirmationOpen] = React.useState(false);
  const [nameField, nameMeta, nameHelper] = useField(`stages.${index}.name`);
  const [colorField, colorMeta, colorHelper] = useField(`stages.${index}.color`);
  const [permissionsField, permissionsMeta, permissionsHelper] = useField(
    `stages.${index}.permissions`
  );
  const roles = useSelector(selectRoles);
  const [{ handlerId, isDragging, handleKeyDown }, stageRef, dropRef, dragRef, dragPreviewRef] =
    useDragAndDrop(canReorder, {
      index,
      item: {
        name: nameField.value,
      },
      onGrabItem: handleGrabStage,
      onDropItem: handleDropStage,
      onMoveItem: handleMoveStage,
      onCancel: handleCancelDragStage,
      type: DRAG_DROP_TYPES.STAGE,
    });

  const composedRef = composeRefs(stageRef, dropRef);

  const colorOptions = AVAILABLE_COLORS.map(({ hex, name }) => ({
    value: hex,
    label: formatMessage(
      {
        id: 'Settings.review-workflows.stage.color.name',
        defaultMessage: '{name}',
      },
      { name }
    ),
    color: hex,
  }));

  const { themeColorName } = getStageColorByHex(colorField.value) ?? {};

  const filteredRoles = roles
    // Super admins always have permissions to do everything and therefore
    // there is no point for this role to show up in the role combobox
    .filter((role) => role.code !== 'strapi-super-admin');

  React.useEffect(() => {
    dragPreviewRef(getEmptyImage(), { captureDraggingState: false });
  }, [dragPreviewRef, index]);

  return (
    <Box ref={composedRef}>
      {liveText && <VisuallyHidden aria-live="assertive">{liveText}</VisuallyHidden>}

      {isDragging ? (
        <StageDropPreview />
      ) : (
        <Accordion
          size="S"
          variant="primary"
          onToggle={() => {
            setIsOpen(!isOpen);

            if (!isOpen) {
              trackUsage('willEditStage');
            }
          }}
          expanded={isOpen}
          shadow="tableShadow"
          error={nameMeta.error ?? colorMeta?.error ?? permissionsMeta?.error ?? false}
          hasErrorMessage={false}
        >
          <AccordionToggle
            title={nameField.value}
            togglePosition="left"
            action={
              (canDelete || canUpdate) && (
                <Flex>
                  <Menu.Root>
                    <ContextMenuTrigger size="S" endIcon={null} paddingLeft={2} paddingRight={2}>
                      <More aria-hidden focusable={false} />
                      <VisuallyHidden as="span">
                        {formatMessage({
                          id: '[tbdb].components.DynamicZone.more-actions',
                          defaultMessage: 'More actions',
                        })}
                      </VisuallyHidden>
                    </ContextMenuTrigger>
                    {/* z-index needs to be as big as the one defined for the wrapper in Stages, otherwise the menu
                     * disappears behind the accordion
                     */}
                    <Menu.Content popoverPlacement="bottom-end" zIndex={2}>
                      <Menu.SubRoot>
                        {canUpdate && (
                          <MenuItem onClick={() => dispatch(cloneStage(id))}>
                            {formatMessage({
                              id: 'Settings.review-workflows.stage.delete',
                              defaultMessage: 'Duplicate stage',
                            })}
                          </MenuItem>
                        )}

                        {canDelete && (
                          <DeleteMenuItem onClick={() => dispatch(deleteStage(id))}>
                            {formatMessage({
                              id: 'Settings.review-workflows.stage.delete',
                              defaultMessage: 'Delete',
                            })}
                          </DeleteMenuItem>
                        )}
                      </Menu.SubRoot>
                    </Menu.Content>
                  </Menu.Root>

                  {canUpdate && (
                    <DragIconButton
                      background="transparent"
                      forwardedAs="div"
                      hasRadius
                      role="button"
                      noBorder
                      tabIndex={0}
                      data-handler-id={handlerId}
                      ref={dragRef}
                      label={formatMessage({
                        id: 'Settings.review-workflows.stage.drag',
                        defaultMessage: 'Drag',
                      })}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={handleKeyDown}
                    >
                      <Drag />
                    </DragIconButton>
                  )}
                </Flex>
              )
            }
          />
          <AccordionContent padding={6} background="neutral0" hasRadius>
            <Grid gap={4}>
              <GridItem col={6}>
                <TextInput
                  {...nameField}
                  id={nameField.name}
                  disabled={!canUpdate}
                  label={formatMessage({
                    id: 'Settings.review-workflows.stage.name.label',
                    defaultMessage: 'Stage name',
                  })}
                  error={nameMeta.error ?? false}
                  onChange={(event) => {
                    nameHelper.setValue(event.target.value);
                    dispatch(updateStage(id, { name: event.target.value }));
                  }}
                  required
                />
              </GridItem>

              <GridItem col={6}>
                <SingleSelect
                  disabled={!canUpdate}
                  error={colorMeta?.error ?? false}
                  id={colorField.name}
                  required
                  label={formatMessage({
                    id: 'content-manager.reviewWorkflows.stage.color',
                    defaultMessage: 'Color',
                  })}
                  onChange={(value) => {
                    colorHelper.setValue(value);
                    dispatch(updateStage(id, { color: value }));
                  }}
                  value={colorField.value.toUpperCase()}
                  startIcon={
                    <Flex
                      as="span"
                      height={2}
                      background={colorField.value}
                      borderColor={themeColorName === 'neutral0' ? 'neutral150' : 'transparent'}
                      hasRadius
                      shrink={0}
                      width={2}
                    />
                  }
                >
                  {colorOptions.map(({ value, label, color }) => {
                    const { themeColorName } = getStageColorByHex(color);

                    return (
                      <SingleSelectOption
                        value={value}
                        key={value}
                        startIcon={
                          <Flex
                            as="span"
                            height={2}
                            background={color}
                            borderColor={
                              themeColorName === 'neutral0' ? 'neutral150' : 'transparent'
                            }
                            hasRadius
                            shrink={0}
                            width={2}
                          />
                        }
                      >
                        {label}
                      </SingleSelectOption>
                    );
                  })}
                </SingleSelect>
              </GridItem>

              <GridItem col={6}>
                {filteredRoles.length === 0 ? (
                  <NotAllowedInput
                    description={{
                      id: 'Settings.review-workflows.stage.permissions.noPermissions.description',
                      defaultMessage: 'You don’t have the permission to see roles',
                    }}
                    intlLabel={{
                      id: 'Settings.review-workflows.stage.permissions.label',
                      defaultMessage: 'Roles that can change this stage',
                    }}
                    name={permissionsField.name}
                  />
                ) : (
                  <Flex alignItems="flex-end" gap={3}>
                    <PermissionWrapper grow={1}>
                      <MultiSelect
                        {...permissionsField}
                        disabled={!canUpdate}
                        error={permissionsMeta.error ?? false}
                        id={permissionsField.name}
                        label={formatMessage({
                          id: 'Settings.review-workflows.stage.permissions.label',
                          defaultMessage: 'Roles that can change this stage',
                        })}
                        onChange={(values) => {
                          // Because the select components expects strings for values, but
                          // the yup schema validates we are sending full permission objects to the API,
                          // we must coerce the string value back to an object
                          const permissions = values.map((value) => ({
                            role: parseInt(value, 10),
                            action: 'admin::review-workflows.stage.transition',
                          }));

                          permissionsHelper.setValue(permissions);
                          dispatch(updateStage(id, { permissions }));
                        }}
                        placeholder={formatMessage({
                          id: 'Settings.review-workflows.stage.permissions.placeholder',
                          defaultMessage: 'Select a role',
                        })}
                        required
                        // The Select component expects strings for values
                        value={(permissionsField.value ?? []).map(
                          (permission) => `${permission.role}`
                        )}
                        withTags
                      >
                        {[
                          {
                            label: formatMessage({
                              id: 'Settings.review-workflows.stage.permissions.allRoles.label',
                              defaultMessage: 'All roles',
                            }),

                            children: filteredRoles.map((role) => ({
                              value: `${role.id}`,
                              label: role.name,
                            })),
                          },
                        ].map((role) => {
                          if ('children' in role) {
                            return (
                              <MultiSelectGroup
                                key={role.label}
                                label={role.label}
                                values={role.children.map((child) => child.value)}
                              >
                                {role.children.map((role) => {
                                  return (
                                    <NestedOption key={role.value} value={role.value}>
                                      {role.label}
                                    </NestedOption>
                                  );
                                })}
                              </MultiSelectGroup>
                            );
                          }

                          return (
                            <MultiSelectOption key={role.value} value={role.value}>
                              {role.label}
                            </MultiSelectOption>
                          );
                        })}
                      </MultiSelect>
                    </PermissionWrapper>

                    <IconButton
                      disabled={!canUpdate}
                      icon={<Duplicate />}
                      label={formatMessage({
                        id: 'Settings.review-workflows.stage.permissions.apply.label',
                        defaultMessage: 'Apply to all stages',
                      })}
                      size="L"
                      variant="secondary"
                      onClick={() => handleApplyPermissionsToAllStages(permissionsField.value)}
                    />
                  </Flex>
                )}
              </GridItem>
            </Grid>
          </AccordionContent>
        </Accordion>
      )}

      <ConfirmDialog.Root
        iconRightButton={null}
        isOpen={isApplyAllConfirmationOpen}
        onToggleDialog={() => setIsApplyAllConfirmationOpen(false)}
        onConfirm={() => {
          dispatch(updateStages({ permissions: permissionsField.value }));
          setIsApplyAllConfirmationOpen(false);
          toggleNotification({
            type: 'success',
            message: formatMessage({
              id: 'Settings.review-workflows.page.edit.confirm.stages.permissions.copy.success',
              defaultMessage: 'Applied roles to all other stages of the workflow',
            }),
          });
        }}
        variantRightButton="primary"
      >
        <ConfirmDialog.Body>
          <Typography textAlign="center" variant="omega">
            {formatMessage({
              id: 'Settings.review-workflows.page.edit.confirm.stages.permissions.copy',
              defaultMessage:
                'Roles that can change that stage will be applied to all the other stages.',
            })}
          </Typography>
        </ConfirmDialog.Body>
      </ConfirmDialog.Root>
    </Box>
  );
}

Stage.propTypes = PropTypes.shape({
  id: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
  canDelete: PropTypes.bool.isRequired,
  canReorder: PropTypes.bool.isRequired,
  canUpdate: PropTypes.bool.isRequired,
  stagesCount: PropTypes.number.isRequired,
}).isRequired;
