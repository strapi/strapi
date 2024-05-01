import * as React from 'react';

import {
  useField,
  useForm,
  useTracking,
  ConfirmDialog,
  useNotification,
  InputRenderer as AdminInputRenderer,
  InputProps,
} from '@strapi/admin/strapi-admin';
import {
  Box,
  Flex,
  MultiSelectOption,
  Accordion,
  AccordionContent,
  AccordionToggle,
  Grid,
  GridItem,
  IconButton,
  MultiSelect,
  MultiSelectGroup,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  VisuallyHidden,
  useComposedRefs,
  Menu,
  MenuItem,
} from '@strapi/design-system';
import { Duplicate, Drag, More, EyeStriked } from '@strapi/icons';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { Stage as IStage, StagePermission } from '../../../../../shared/contracts/review-workflows';
import { useGetRolesQuery } from '../../../services/admin';
import { AVAILABLE_COLORS, getStageColorByHex } from '../../../utils/colors';
import { DRAG_DROP_TYPES } from '../constants';
import { useDragAndDrop } from '../hooks/useDragAndDrop';

import { AddStage } from './AddStage';

interface WorkflowStage extends Pick<IStage, 'id' | 'name' | 'permissions' | 'color'> {
  __temp_key__: string;
}

/* -------------------------------------------------------------------------------------------------
 * Stages
 * -----------------------------------------------------------------------------------------------*/
interface StagesProps {
  canDelete?: boolean;
  canUpdate?: boolean;
  isCreating?: boolean;
}

const Stages = ({ canDelete = true, canUpdate = true, isCreating = false }: StagesProps) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const addFieldRow = useForm('Stages', (state) => state.addFieldRow);
  const { value: stages = [] } = useField<WorkflowStage[]>('stages');

  return (
    <Flex direction="column" gap={6} width="100%">
      <Box position="relative" width="100%">
        <Background
          background="neutral200"
          height="100%"
          left="50%"
          position="absolute"
          top="0"
          width={2}
          zIndex={1}
        />

        <Flex
          direction="column"
          alignItems="stretch"
          gap={6}
          zIndex={2}
          position="relative"
          tag="ol"
        >
          {stages.map((stage, index) => {
            return (
              <Box key={stage.__temp_key__} tag="li">
                <Stage
                  index={index}
                  canDelete={stages.length > 1 && canDelete}
                  canReorder={stages.length > 1}
                  canUpdate={canUpdate}
                  stagesCount={stages.length}
                  isOpen={isCreating}
                  {...stage}
                />
              </Box>
            );
          })}
        </Flex>
      </Box>

      {canUpdate && (
        <AddStage
          type="button"
          onClick={() => {
            addFieldRow('stages', { name: '' });
            trackUsage('willCreateStage');
          }}
        >
          {formatMessage({
            id: 'Settings.review-workflows.stage.add',
            defaultMessage: 'Add new stage',
          })}
        </AddStage>
      )}
    </Flex>
  );
};

const Background = styled(Box)`
  transform: translateX(-50%);
`;

/* -------------------------------------------------------------------------------------------------
 * Stage
 * -----------------------------------------------------------------------------------------------*/
interface StageProps extends WorkflowStage {
  canDelete?: boolean;
  canReorder?: boolean;
  canUpdate?: boolean;
  isOpen?: boolean;
  index: number;
  stagesCount: number;
}

const Stage = ({
  index,
  canDelete = false,
  canReorder = false,
  canUpdate = false,
  isOpen: isOpenDefault = false,
  stagesCount,
  name,
  permissions,
  color,
}: StageProps) => {
  const [liveText, setLiveText] = React.useState<string>();
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const [isOpen, setIsOpen] = React.useState(isOpenDefault);
  const stageErrors = useForm('Stages', (state) => state.errors.stages as object[]);
  const error = stageErrors?.[index];
  const addFieldRow = useForm('Stage', (state) => state.addFieldRow);
  const moveFieldRow = useForm('Stage', (state) => state.moveFieldRow);
  const removeFieldRow = useForm('Stage', (state) => state.removeFieldRow);

  const getItemPos = (index: number) => `${index + 1} of ${stagesCount}`;

  const handleGrabStage = (index: number) => {
    setLiveText(
      formatMessage(
        {
          id: 'dnd.grab-item',
          defaultMessage: `{item}, grabbed. Current position in list: {position}. Press up and down arrow to change position, Spacebar to drop, Escape to cancel.`,
        },
        {
          item: name,
          position: getItemPos(index),
        }
      )
    );
  };

  const handleDropStage = (index: number) => {
    setLiveText(
      formatMessage(
        {
          id: 'dnd.drop-item',
          defaultMessage: `{item}, dropped. Final position in list: {position}.`,
        },
        {
          item: name,
          position: getItemPos(index),
        }
      )
    );
  };

  const handleCancelDragStage = () => {
    setLiveText(
      formatMessage(
        {
          id: 'dnd.cancel-item',
          defaultMessage: '{item}, dropped. Re-order cancelled.',
        },
        {
          item: name,
        }
      )
    );
  };

  const handleMoveStage = (newIndex: number, oldIndex: number) => {
    setLiveText(
      formatMessage(
        {
          id: 'dnd.reorder',
          defaultMessage: '{item}, moved. New position in list: {position}.',
        },
        {
          item: name,
          position: getItemPos(newIndex),
        }
      )
    );

    moveFieldRow('stages', oldIndex, newIndex);
  };

  const [{ handlerId, isDragging, handleKeyDown }, stageRef, dropRef, dragRef, dragPreviewRef] =
    useDragAndDrop(canReorder, {
      index,
      item: {
        index,
        name,
      },
      onGrabItem: handleGrabStage,
      onDropItem: handleDropStage,
      onMoveItem: handleMoveStage,
      onCancel: handleCancelDragStage,
      type: DRAG_DROP_TYPES.STAGE,
    });

  const composedRef = useComposedRefs(stageRef, dropRef);

  React.useEffect(() => {
    dragPreviewRef(getEmptyImage(), { captureDraggingState: false });
  }, [dragPreviewRef, index]);

  const handleCloneClick = () => {
    addFieldRow('stages', { name, color, permissions });
  };

  return (
    <Box ref={(ref) => composedRef(ref!)}>
      {liveText && <VisuallyHidden aria-live="assertive">{liveText}</VisuallyHidden>}

      {isDragging ? (
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
          error={Object.values(error ?? {})[0]}
          hasErrorMessage={false}
        >
          <AccordionToggle
            title={name}
            togglePosition="left"
            action={
              (canDelete || canUpdate) && (
                <Flex>
                  <Menu.Root>
                    <ContextMenuTrigger size="S" endIcon={null} paddingLeft={2} paddingRight={2}>
                      <More aria-hidden focusable={false} />
                      <VisuallyHidden tag="span">
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
                          <MenuItem onClick={handleCloneClick}>
                            {formatMessage({
                              id: 'Settings.review-workflows.stage.delete',
                              defaultMessage: 'Duplicate stage',
                            })}
                          </MenuItem>
                        )}

                        {canDelete && (
                          <DeleteMenuItem onClick={() => removeFieldRow('stages', index)}>
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
                      // @ts-expect-error – `forwardedAs` can be a string.
                      tag="div"
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
              {[
                {
                  disabled: !canUpdate,
                  label: formatMessage({
                    id: 'Settings.review-workflows.stage.name.label',
                    defaultMessage: 'Stage name',
                  }),
                  name: `stages.${index}.name`,
                  required: true,
                  size: 6,
                  type: 'string' as const,
                },
                {
                  disabled: !canUpdate,
                  label: formatMessage({
                    id: 'content-manager.reviewWorkflows.stage.color',
                    defaultMessage: 'Color',
                  }),
                  name: `stages.${index}.color`,
                  required: true,
                  size: 6,
                  type: 'color' as const,
                },
                {
                  disabled: !canUpdate,
                  label: formatMessage({
                    id: 'Settings.review-workflows.stage.permissions.label',
                    defaultMessage: 'Roles that can change this stage',
                  }),
                  name: `stages.${index}.permissions`,
                  placeholder: formatMessage({
                    id: 'Settings.review-workflows.stage.permissions.placeholder',
                    defaultMessage: 'Select a role',
                  }),
                  required: true,
                  size: 6,
                  type: 'permissions' as const,
                },
              ].map(({ size, ...field }) => (
                <GridItem key={field.name} col={size}>
                  <InputRenderer {...field} />
                </GridItem>
              ))}
            </Grid>
          </AccordionContent>
        </Accordion>
      )}
    </Box>
  );
};

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

  &:hover,
  &:focus {
    background-color: ${({ theme }) => theme.colors.neutral100};
  }

  svg {
    height: auto;
    width: ${({ theme }) => theme.spaces[3]};
  }
`;

/* -------------------------------------------------------------------------------------------------
 * InputRenderer
 * -----------------------------------------------------------------------------------------------*/

type InputRendererProps = InputProps | ColorSelectorProps | PermissionsFieldProps;

const InputRenderer = (props: InputRendererProps) => {
  switch (props.type) {
    case 'color':
      return <ColorSelector {...props} />;
    case 'permissions':
      return <PermissionsField {...props} />;
    default:
      return <AdminInputRenderer {...props} />;
  }
};

/* -------------------------------------------------------------------------------------------------
 * ColorSelector
 * -----------------------------------------------------------------------------------------------*/

interface ColorSelectorProps
  extends Omit<Extract<InputProps, { type: 'enumeration' }>, 'type' | 'options'> {
  type: 'color';
}

const ColorSelector = ({ disabled, label, name, required }: ColorSelectorProps) => {
  const { formatMessage } = useIntl();
  const { value, error, onChange } = useField<string>(name);

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

  const { themeColorName } = getStageColorByHex(value) ?? {};

  return (
    <SingleSelect
      disabled={disabled}
      error={error}
      required={required}
      // @ts-expect-error – ReactNode is fine for the `label` prop.
      label={label}
      onChange={(v) => {
        onChange(name, v.toString());
      }}
      value={value?.toUpperCase()}
      startIcon={
        <Flex
          tag="span"
          height={2}
          background={value}
          // @ts-expect-error - transparent doesn't exist in theme.colors
          borderColor={themeColorName === 'neutral0' ? 'neutral150' : 'transparent'}
          hasRadius
          shrink={0}
          width={2}
        />
      }
    >
      {colorOptions.map(({ value, label, color }) => {
        const { themeColorName } = getStageColorByHex(color) || {};

        return (
          <SingleSelectOption
            value={value}
            key={value}
            startIcon={
              <Flex
                tag="span"
                height={2}
                background={color}
                // @ts-expect-error - transparent doesn't exist in theme.colors
                borderColor={themeColorName === 'neutral0' ? 'neutral150' : 'transparent'}
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
  );
};

/* -------------------------------------------------------------------------------------------------
 * PermissionsField
 * -----------------------------------------------------------------------------------------------*/
interface PermissionsFieldProps
  extends Omit<Extract<InputProps, { type: 'enumeration' }>, 'type' | 'options'> {
  type: 'permissions';
}

const PermissionsField = ({ disabled, name, placeholder, required }: PermissionsFieldProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const [isApplyAllConfirmationOpen, setIsApplyAllConfirmationOpen] = React.useState(false);
  const { value = [], error, onChange } = useField<StagePermission[]>(name);
  const allStages = useForm<WorkflowStage[]>('PermissionsField', (state) => state.values.stages);
  const onFormValueChange = useForm('PermissionsField', (state) => state.onChange);

  const { data: roles = [], isLoading } = useGetRolesQuery();

  // Super admins always have permissions to do everything and therefore
  // there is no point for this role to show up in the role combobox
  const filteredRoles = roles?.filter((role) => role.code !== 'strapi-super-admin') ?? [];

  React.useEffect(() => {
    if (!isLoading && roles.length === 0) {
      toggleNotification({
        blockTransition: true,
        type: 'danger',
        message: formatMessage({
          id: 'review-workflows.stage.permissions.noPermissions.description',
          defaultMessage: 'You don’t have the permission to see roles',
        }),
      });
    }
  }, [formatMessage, isLoading, roles, toggleNotification]);

  if (!isLoading && filteredRoles.length === 0) {
    return (
      <TextInput
        disabled
        name={name}
        hint={formatMessage({
          id: 'Settings.review-workflows.stage.permissions.noPermissions.description',
          defaultMessage: 'You don’t have the permission to see roles',
        })}
        label={formatMessage({
          id: 'Settings.review-workflows.stage.permissions.label',
          defaultMessage: 'Roles that can change this stage',
        })}
        placeholder={formatMessage({
          id: 'components.NotAllowedInput.text',
          defaultMessage: 'No permissions to see this field',
        })}
        required={required}
        startAction={<StyledIcon />}
        type="text"
        value=""
      />
    );
  }

  return (
    <>
      <Flex alignItems="flex-end" gap={3}>
        <PermissionWrapper grow={1}>
          <MultiSelect
            disabled={disabled}
            error={error}
            id={name}
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

              onChange(name, permissions);
            }}
            placeholder={placeholder}
            required
            // The Select component expects strings for values
            value={value.map((permission) => `${permission.role}`)}
            withTags
          >
            <MultiSelectGroup
              label={formatMessage({
                id: 'Settings.review-workflows.stage.permissions.allRoles.label',
                defaultMessage: 'All roles',
              })}
              values={filteredRoles.map((r) => `${r.id}`)}
            >
              {filteredRoles.map((role) => {
                return (
                  <NestedOption key={role.id} value={`${role.id}`}>
                    {role.name}
                  </NestedOption>
                );
              })}
            </MultiSelectGroup>
          </MultiSelect>
        </PermissionWrapper>

        <IconButton
          disabled={disabled}
          icon={<Duplicate />}
          label={formatMessage({
            id: 'Settings.review-workflows.stage.permissions.apply.label',
            defaultMessage: 'Apply to all stages',
          })}
          size="L"
          variant="secondary"
          onClick={() => setIsApplyAllConfirmationOpen(true)}
        />
      </Flex>
      <ConfirmDialog
        isOpen={isApplyAllConfirmationOpen}
        onClose={() => setIsApplyAllConfirmationOpen(false)}
        onConfirm={() => {
          onFormValueChange(
            'stages',
            allStages.map((stage) => ({
              ...stage,
              permissions: value,
            }))
          );

          setIsApplyAllConfirmationOpen(false);
          toggleNotification({
            type: 'success',
            message: formatMessage({
              id: 'Settings.review-workflows.page.edit.confirm.stages.permissions.copy.success',
              defaultMessage: 'Applied roles to all other stages of the workflow',
            }),
          });
        }}
        variant="default"
      >
        {formatMessage({
          id: 'Settings.review-workflows.page.edit.confirm.stages.permissions.copy',
          defaultMessage:
            'Roles that can change that stage will be applied to all the other stages.',
        })}
      </ConfirmDialog>
    </>
  );
};

const StyledIcon = styled(EyeStriked)`
  & > path {
    fill: ${({ theme }) => theme.colors.neutral600};
  }
`;

const NestedOption = styled(MultiSelectOption)`
  padding-left: ${({ theme }) => theme.spaces[7]};
`;

// Grow the size of the permission Select
const PermissionWrapper = styled(Flex)`
  > * {
    flex-grow: 1;
  }
`;

export { Stages };
export type { StagesProps, WorkflowStage };
