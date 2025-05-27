import * as React from 'react';

import {
  useDroppable,
  DndContext,
  UniqueIdentifier,
  DragOverlay,
  closestCenter,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useField, useForm } from '@strapi/admin/strapi-admin';
import {
  Modal,
  Box,
  Flex,
  Grid,
  IconButton,
  IconButtonComponent,
  Typography,
  Link,
  Menu,
} from '@strapi/design-system';
import { Cog, Cross, Drag, Pencil, Plus } from '@strapi/icons';
import { generateNKeysBetween as generateNKeysBetweenImpl } from 'fractional-indexing';
import { produce } from 'immer';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';
import { styled } from 'styled-components';

import { getTranslation } from '../../utils/translations';
import { ComponentIcon } from '../ComponentIcon';

import { EditFieldForm, EditFieldFormProps } from './EditFieldForm';

import type { ConfigurationFormData, EditFieldSpacerLayout } from './Form';
import type { EditLayout } from '../../hooks/useDocumentLayout';

type FormField = ConfigurationFormData['layout'][number]['children'][number];
type Field = Omit<ConfigurationFormData['layout'][number]['children'][number], '__temp_key__'>;

/* -------------------------------------------------------------------------------------------------
 * Drag and Drop
 * -----------------------------------------------------------------------------------------------*/

const DroppableContainer = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { setNodeRef } = useDroppable({
    id,
  });

  return <div ref={setNodeRef}>{children}</div>;
};

export const SortableItem = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { attributes, setNodeRef, transform, transition } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {children}
    </div>
  );
};

const useDndContainers = (layout: ConfigurationFormData['layout']) => {
  const createDragAndDropContainersFromLayout = React.useCallback(
    (layout: ConfigurationFormData['layout']) => {
      return layout.map((row, containerIndex) => ({
        ...row,
        // Use unique ids for drag and drop items
        dndId: `container-${crypto.randomUUID()}`,
        children: row.children.map((child, childIndex) => ({
          ...child,
          dndId: `item-${crypto.randomUUID()}`,
          formName: `layout.${containerIndex}.children.${childIndex}`,
        })),
      }));
    },
    []
  );

  const [containers, setContainers] = React.useState(() =>
    createDragAndDropContainersFromLayout(layout)
  );

  const [activeDragItem, setActiveDragItem] = React.useState<
    (typeof containers)[number]['children'][number] | null
  >(null);

  function findContainer(
    id: UniqueIdentifier,
    containersAsDictionary: Record<string, (typeof containers)[number]>
  ) {
    if (id in containersAsDictionary) {
      return id;
    }

    return Object.keys(containersAsDictionary).find((key) =>
      containersAsDictionary[key].children.find((child) => child.dndId === id)
    );
  }

  const getActiveItem = (id: UniqueIdentifier, container: (typeof containers)[number]) => {
    return container.children.find((item) => id === item.dndId);
  };

  const createContainersWithSpacers = (layout: typeof containers) => {
    return layout
      .map((row) => ({
        ...row,
        children: row.children.filter((field) => field.name !== TEMP_FIELD_NAME),
      }))
      .filter((row) => row.children.length > 0)
      .map((row) => {
        const totalSpaceTaken = row.children.reduce((acc, curr) => acc + curr.size, 0);

        if (totalSpaceTaken < 12) {
          const [spacerKey] = generateNKeysBetweenImpl(
            row.children.at(-1)?.__temp_key__,
            undefined,
            1
          );

          return {
            ...row,
            children: [
              ...row.children,
              {
                name: TEMP_FIELD_NAME,
                size: 12 - totalSpaceTaken,
                __temp_key__: spacerKey,
              } satisfies EditFieldSpacerLayout,
            ],
          };
        }

        return row;
      });
  };

  /**
   * Recomputes the containers when a value in layout changes,
   * for example when a field size is changed.
   */
  React.useEffect(() => {
    setContainers(createDragAndDropContainersFromLayout(layout));
  }, [layout, createDragAndDropContainersFromLayout]);

  return {
    containers,
    setContainers,
    activeDragItem,
    setActiveDragItem,
    findContainer,
    getActiveItem,
    createContainersWithSpacers,
  };
};

/* -------------------------------------------------------------------------------------------------
 * Fields
 * -----------------------------------------------------------------------------------------------*/

interface FieldsProps extends Pick<EditLayout, 'metadatas'>, Pick<FieldProps, 'components'> {
  attributes: {
    [key: string]: FieldProps['attribute'];
  };
  fieldSizes: Record<string, number>;
  components: EditLayout['components'];
}

const Fields = ({ attributes, fieldSizes, components, metadatas = {} }: FieldsProps) => {
  const { formatMessage } = useIntl();

  const layout = useForm<ConfigurationFormData['layout']>(
    'Fields',
    (state) => state.values.layout ?? []
  );

  const onChange = useForm('Fields', (state) => state.onChange);
  const addFieldRow = useForm('Fields', (state) => state.addFieldRow);
  const removeFieldRow = useForm('Fields', (state) => state.removeFieldRow);

  const {
    containers,
    activeDragItem,
    setActiveDragItem,
    findContainer,
    getActiveItem,
    setContainers,
    createContainersWithSpacers,
  } = useDndContainers(layout);

  const existingFields = layout.map((row) => row.children.map((field) => field.name)).flat();

  /**
   * Get the fields that are not already in the layout
   * But also check that they are visible before we give users
   * the option to display them. e.g. `id` is not visible.
   */
  const remainingFields = Object.entries(metadatas).reduce<Field[]>((acc, current) => {
    const [name, { visible, ...field }] = current;

    if (!existingFields.includes(name) && visible === true) {
      const type = attributes[name]?.type;
      const size = type ? fieldSizes[type] : 12;

      acc.push({
        ...field,
        label: field.label ?? name,
        name,
        size,
      });
    }

    return acc;
  }, []);

  const handleRemoveField =
    (rowIndex: number, fieldIndex: number): FieldProps['onRemoveField'] =>
    () => {
      if (layout[rowIndex].children.length === 1) {
        removeFieldRow(`layout`, rowIndex);
      } else {
        onChange(`layout.${rowIndex}.children`, [
          ...layout[rowIndex].children.slice(0, fieldIndex),
          ...layout[rowIndex].children.slice(fieldIndex + 1),
        ]);
      }
    };

  const handleAddField = (field: Field) => () => {
    addFieldRow('layout', { children: [field] });
  };

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={(event) => {
        const containersAsDictionary = Object.fromEntries(
          containers.map((container) => [container.dndId, container])
        );
        const activeContainer = findContainer(event.active.id, containersAsDictionary);

        if (!activeContainer) return;

        const activeItem = getActiveItem(event.active.id, containersAsDictionary[activeContainer]);

        if (activeItem) {
          setActiveDragItem(activeItem);
        }
      }}
      onDragOver={({ active, over }) => {
        const containersAsDictionary = Object.fromEntries(
          containers.map((container) => [container.dndId, container])
        );
        const activeContainer = findContainer(active.id, containersAsDictionary);
        const overContainer = findContainer(over?.id ?? '', containersAsDictionary);
        const activeContainerIndex = containers.findIndex(
          (container) => container.dndId === activeContainer
        );
        const overContainerIndex = containers.findIndex(
          (container) => container.dndId === overContainer
        );

        if (!activeContainer || !overContainer) {
          return;
        }

        const draggedItem = getActiveItem(active.id, containersAsDictionary[activeContainer]);
        const overItems = containersAsDictionary[overContainer].children;
        const overIndex = overItems.findIndex((item) => item.dndId === over?.id);

        if (!draggedItem) return;

        // Handle a full width field being dragged
        if (draggedItem?.size === 12) {
          // Move the item and its container
          const update = arrayMove(containers, activeContainerIndex, overContainerIndex);
          setContainers(update);
          return;
        }

        /**
         * Handle an item being dragged from one container to another,
         * the item is removed from its current container, and then added to its new container
         * An item can only be added in a container if there is enough space.
         */
        const update = produce(containers, (draft) => {
          draft[activeContainerIndex].children = draft[activeContainerIndex].children.filter(
            (item) => item.dndId !== active.id
          );
          const spaceTaken = draft[overContainerIndex].children.reduce((acc, curr) => {
            if (curr.name === TEMP_FIELD_NAME) {
              return acc;
            }

            return acc + curr.size;
          }, 0);

          // Check the sizes of the children, if there is no room, exit
          if (spaceTaken + draggedItem.size > 12) {
            // Leave the item where it started
            draft[activeContainerIndex].children = containers[activeContainerIndex].children;
            return;
          }

          // There is room for the item, drop it
          draft[overContainerIndex].children.splice(overIndex, 0, draggedItem);
        });

        setContainers(update);
      }}
      onDragEnd={(event) => {
        const { active, over } = event;
        const { id } = active;
        const overId = over?.id;
        const containersAsDictionary = Object.fromEntries(
          containers.map((container) => [container.dndId, container])
        );
        const activeContainer = findContainer(id, containersAsDictionary);
        const overContainer = findContainer(overId!, containersAsDictionary);

        if (!activeContainer || !overContainer) {
          return;
        }

        const activeIndex = containersAsDictionary[activeContainer].children.findIndex(
          (children) => children.dndId === id
        );
        const overIndex = containersAsDictionary[overContainer].children.findIndex(
          (children) => children.dndId === overId
        );

        const movedContainerItems = produce(containersAsDictionary, (draft) => {
          if (activeIndex !== overIndex) {
            // Move items around inside their own container
            draft[activeContainer].children = arrayMove(
              draft[activeContainer].children,
              activeIndex,
              overIndex
            );
          }
        });
        const updatedContainers = Object.values(movedContainerItems);
        const containersWithSpacedItems = createContainersWithSpacers(
          updatedContainers
        ) as typeof containers;

        // Remove properties the server does not expect before updating the form
        const updatedLayout = containersWithSpacedItems.map(
          ({ dndId: _dndId, children, ...container }) => ({
            ...container,
            children: children.map(({ dndId: _dndId, formName: _formName, ...child }) => child),
          })
        );

        onChange('layout', updatedLayout);
        setActiveDragItem(null);
      }}
    >
      <Flex paddingTop={6} direction="column" alignItems="stretch" gap={4}>
        <Flex alignItems="flex-start" direction="column" justifyContent="space-between">
          <Typography fontWeight="bold">
            {formatMessage({
              id: getTranslation('containers.list.displayedFields'),
              defaultMessage: 'Displayed fields',
            })}
          </Typography>
          <Typography variant="pi" textColor="neutral600">
            {formatMessage({
              id: 'containers.SettingPage.editSettings.description',
              defaultMessage: 'Drag & drop the fields to build the layout',
            })}
          </Typography>
        </Flex>
        <Box padding={4} hasRadius borderStyle="dashed" borderWidth="1px" borderColor="neutral300">
          <Flex direction="column" alignItems="stretch" gap={2}>
            {containers.map((container, containerIndex) => (
              <React.Fragment key={container.dndId}>
                <SortableContext
                  id={container.dndId}
                  items={container.children.map((child) => ({ id: child.dndId }))}
                >
                  <DroppableContainer id={container.dndId}>
                    <Grid.Root gap={2}>
                      {container.children.map((child, childIndex) => (
                        <Grid.Item
                          col={child.size}
                          key={child.dndId}
                          direction="column"
                          alignItems="stretch"
                        >
                          <SortableItem id={child.dndId}>
                            <Field
                              attribute={attributes[child.name]}
                              components={components}
                              name={child.formName}
                              onRemoveField={handleRemoveField(containerIndex, childIndex)}
                              dndId={child.dndId}
                            />
                          </SortableItem>
                        </Grid.Item>
                      ))}
                    </Grid.Root>
                  </DroppableContainer>
                </SortableContext>
              </React.Fragment>
            ))}
            <DragOverlay>
              {activeDragItem ? (
                <Field
                  attribute={attributes[activeDragItem.name]}
                  components={components}
                  name={activeDragItem.formName}
                  dndId={activeDragItem.dndId}
                />
              ) : null}
            </DragOverlay>
            <Menu.Root>
              <Menu.Trigger
                startIcon={<Plus />}
                endIcon={null}
                disabled={remainingFields.length === 0}
                fullWidth
                variant="secondary"
              >
                {formatMessage({
                  id: getTranslation('containers.SettingPage.add.field'),
                  defaultMessage: 'Insert another field',
                })}
              </Menu.Trigger>
              <Menu.Content>
                {remainingFields.map((field) => (
                  <Menu.Item key={field.name} onSelect={handleAddField(field)}>
                    {field.label}
                  </Menu.Item>
                ))}
              </Menu.Content>
            </Menu.Root>
          </Flex>
        </Box>
      </Flex>
    </DndContext>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Field
 * -----------------------------------------------------------------------------------------------*/

interface FieldProps extends Pick<EditFieldFormProps, 'name' | 'attribute'> {
  components: EditLayout['components'];
  dndId: string;
  onRemoveField?: React.MouseEventHandler<HTMLButtonElement>;
}

const TEMP_FIELD_NAME = '_TEMP_';

/**
 * Displays a field in the layout with drag options, also
 * opens a modal  to edit the details of said field.
 */
const Field = ({ attribute, components, name, onRemoveField, dndId }: FieldProps) => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const { formatMessage } = useIntl();
  const { value } = useField<FormField>(name);
  const { listeners, setActivatorNodeRef } = useSortable({
    id: dndId,
  });

  const handleRemoveField: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onRemoveField) {
      onRemoveField?.(e);
    }
  };

  const onEditFieldMeta: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsModalOpen(true);
  };

  if (!value) {
    return null;
  }

  if (value.name === TEMP_FIELD_NAME) {
    return <Flex tag="span" height="100%" style={{ opacity: 0 }} />;
  }

  if (!attribute) {
    return null;
  }

  return (
    <Modal.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
      <Flex
        borderColor="neutral150"
        background="neutral100"
        hasRadius
        gap={3}
        cursor="pointer"
        onClick={() => {
          setIsModalOpen(true);
        }}
      >
        <DragButton
          ref={setActivatorNodeRef}
          tag="span"
          withTooltip={false}
          label={formatMessage(
            {
              id: getTranslation('components.DraggableCard.move.field'),
              defaultMessage: 'Move {item}',
            },
            { item: value.label }
          )}
          {...listeners}
        >
          <Drag />
        </DragButton>
        <Flex direction="column" alignItems="flex-start" grow={1} overflow="hidden">
          <Flex gap={3} justifyContent="space-between" width="100%">
            <Typography ellipsis fontWeight="bold">
              {value.label}
            </Typography>
            <Flex>
              <IconButton
                type="button"
                variant="ghost"
                background="transparent"
                onClick={onEditFieldMeta}
                withTooltip={false}
                label={formatMessage(
                  {
                    id: getTranslation('components.DraggableCard.edit.field'),
                    defaultMessage: 'Edit {item}',
                  },
                  { item: value.label }
                )}
              >
                <Pencil />
              </IconButton>
              <IconButton
                type="button"
                variant="ghost"
                onClick={handleRemoveField}
                background="transparent"
                withTooltip={false}
                label={formatMessage(
                  {
                    id: getTranslation('components.DraggableCard.delete.field'),
                    defaultMessage: 'Delete {item}',
                  },
                  { item: value.label }
                )}
              >
                <Cross />
              </IconButton>
            </Flex>
          </Flex>
          {attribute?.type === 'component' ? (
            <Flex
              paddingTop={3}
              paddingRight={3}
              paddingBottom={3}
              paddingLeft={0}
              alignItems="flex-start"
              direction="column"
              gap={2}
              width="100%"
            >
              <Grid.Root gap={4} width="100%">
                {components[attribute.component].layout.map((row) =>
                  row.map(({ size, ...field }) => (
                    <Grid.Item key={field.name} col={size} direction="column" alignItems="stretch">
                      <Flex
                        alignItems="center"
                        background="neutral0"
                        paddingTop={2}
                        paddingBottom={2}
                        paddingLeft={3}
                        paddingRight={3}
                        hasRadius
                        borderColor="neutral200"
                      >
                        <Typography textColor="neutral800">{field.name}</Typography>
                      </Flex>
                    </Grid.Item>
                  ))
                )}
              </Grid.Root>
              <Link
                // used to stop the edit form from appearing when we click here.
                onClick={(e) => e.stopPropagation()}
                startIcon={<Cog />}
                tag={NavLink}
                to={`../components/${attribute.component}/configurations/edit`}
              >
                {formatMessage({
                  id: getTranslation('components.FieldItem.linkToComponentLayout'),
                  defaultMessage: "Set the component's layout",
                })}
              </Link>
            </Flex>
          ) : null}
          {attribute?.type === 'dynamiczone' ? (
            <Flex
              paddingTop={3}
              paddingRight={3}
              paddingBottom={3}
              paddingLeft={0}
              alignItems="flex-start"
              gap={2}
              width="100%"
            >
              {attribute?.components.map((uid) => (
                <ComponentLink
                  // used to stop the edit form from appearing when we click here.
                  onClick={(e) => e.stopPropagation()}
                  key={uid}
                  to={`../components/${uid}/configurations/edit`}
                >
                  <ComponentIcon icon={components[uid].settings.icon} />
                  <Typography fontSize={1} textColor="neutral600" fontWeight="bold">
                    {components[uid].settings.displayName}
                  </Typography>
                </ComponentLink>
              ))}
            </Flex>
          ) : null}
        </Flex>
      </Flex>
      {value.name !== TEMP_FIELD_NAME && (
        <EditFieldForm attribute={attribute} name={name} onClose={() => setIsModalOpen(false)} />
      )}
    </Modal.Root>
  );
};

const DragButton = styled<IconButtonComponent<'span'>>(IconButton)`
  height: unset;
  align-self: stretch;
  display: flex;
  align-items: center;
  padding: 0;
  border: none;
  background-color: transparent;
  border-radius: 0px;
  border-right: 1px solid ${({ theme }) => theme.colors.neutral150};
  cursor: all-scroll;

  svg {
    width: 1.2rem;
    height: 1.2rem;
  }
`;

const ComponentLink = styled(NavLink)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spaces[1]};
  padding: ${(props) => props.theme.spaces[2]};
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  background: ${({ theme }) => theme.colors.neutral0};
  width: 14rem;
  border-radius: ${({ theme }) => theme.borderRadius};
  text-decoration: none;

  &:focus,
  &:hover {
    ${({ theme }) => `
      background-color: ${theme.colors.primary100};
      border-color: ${theme.colors.primary200};

      ${Typography} {
          color: ${theme.colors.primary600};
      }
    `}

    /* > ComponentIcon */
    > div:first-child {
      background: ${({ theme }) => theme.colors.primary200};
      color: ${({ theme }) => theme.colors.primary600};

      svg {
        path {
          fill: ${({ theme }) => theme.colors.primary600};
        }
      }
    }
  }
`;

export { Fields, TEMP_FIELD_NAME };
export type { FieldsProps };
