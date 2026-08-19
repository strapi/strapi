import { useRef } from 'react';

import { useSortable } from '@dnd-kit/sortable';
import { Box, Flex, Menu, Typography, VisuallyHidden } from '@strapi/design-system';
import { ChevronDown, More, Pencil, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';
import { css, styled } from 'styled-components';

import { getTrad } from '../../../../utils/getTrad';
import { Status } from '../../../Status';

import { FolderNameField } from './FolderNameField';

import type { SectionKey } from '../../../DataManager/utils/contentStructure';
import type { FolderNode } from '../../lib/buildFolderTree';
import type { FlatItem } from '../../lib/flatModel';

/**
 * The drop-position indicator is absolutely positioned so that it does not displace
 * a row and cause cyclical layout shifts.
 * It is justified to the right edge of the row and its width is based on the
 * depth of the destination it indicates.
 */
const DropIndicator = styled.span<{ $edge: 'top' | 'bottom'; $indentDepth: number }>`
  position: absolute;
  left: ${({ theme, $indentDepth }) => `calc(${$indentDepth} * ${theme.spaces[6]})`};
  right: 0;
  ${({ $edge }) => ($edge === 'top' ? 'top: 0;' : 'bottom: 0;')}
  transform: ${({ $edge }) => ($edge === 'top' ? 'translateY(-1px)' : 'translateY(1px)')};

  height: 2px;
  background-color: ${({ theme }) => theme.colors.primary600};
  border-radius: 2px;
  pointer-events: none;
  z-index: 2;

  &::before {
    content: '';

    position: absolute;
    top: 50%;
    left: 0;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: ${({ theme }) => theme.colors.primary600};
    transform: translate(-50%, -50%);
  }
`;

const MenuTrigger = styled(Menu.Trigger)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;

  position: relative;
  z-index: 1;
`;

const Row = styled(Flex)<{ $depth: number; $dropTarget?: boolean; $dragging?: boolean }>`
  position: relative;
  border-radius: ${({ theme }) => theme.borderRadius};

  padding-right: ${({ theme }) => theme.spaces[3]};
  padding-block: ${({ theme }) => theme.spaces[2]};
  padding-left: ${({ theme }) => theme.spaces[3]};
  padding-left: ${({ theme, $depth }) =>
    `calc(${$depth} * ${theme.spaces[6]} + ${theme.spaces[3]})`};

  background-color: ${({ $dropTarget, theme }) =>
    $dropTarget ? theme.colors.primary100 : 'transparent'};
  outline: ${({ $dropTarget, theme }) =>
    $dropTarget ? `1px solid ${theme.colors.primary600}` : 'none'};
  outline-offset: -1px;

  ${MenuTrigger} {
    opacity: 0;
    transition: opacity 0.1s ease-out;
  }

  /*
   * This selects for the opened Radix popover menu so that the hover state doesn't disappear while it is open.
   */
  &:hover,
  &:has([data-state='open']) {
    background-color: ${({ $dropTarget, theme }) =>
      $dropTarget ? theme.colors.primary100 : theme.colors.neutral100};
  }

  &:hover ${MenuTrigger}, &:focus-within ${MenuTrigger}, &:has([data-state='open']) ${MenuTrigger} {
    opacity: 1;
  }

  ${({ $dragging }) =>
    $dragging &&
    css`
      & > *:not(${DropIndicator}) {
        opacity: 0.4;
      }
    `}
`;

const GrabArea = styled.button`
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  gap: ${({ theme }) => theme.spaces[2]};

  height: 100%;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;

  /* The interactive area must be larger than the contents-driven hit area. */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
  }

  &:focus-visible {
    outline-offset: -2px;
  }
`;

const ContentTypeLink = styled(NavLink)`
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  gap: ${({ theme }) => theme.spaces[2]};

  height: 100%;
  text-decoration: none;
  color: ${({ theme }) => theme.colors.neutral800};

  &.active {
    color: ${({ theme }) => theme.colors.primary700};
    font-weight: 500;
  }

  /* The interactive area must be larger than the contents-driven hit area. */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
  }

  &:focus-visible {
    outline-offset: -2px;
  }
`;

const Glyph = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 16px;
`;

const Bullet = styled(Glyph)`
  &::before {
    content: '';
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background-color: currentColor;
  }
`;

const Label = styled(Typography)`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export interface TreeHandlers {
  section: SectionKey;
  canEdit: boolean;
  /** Whether a folder can be collapsed / uncollapsed. */
  canToggle?: boolean;
  editingId: string | null;
  isCollapsed: (id: string) => boolean;
  onToggle: (id: string) => void;
  onBeginRename: (id: string) => void;
  onSubmitRename: (id: string, name: string) => void;
  onCancelRename: () => void;
  onDeleteFolder: (node: FolderNode) => void;
  onDeleteFolderAndContent: (node: FolderNode) => void;
  validateFolderName: (params: {
    name: string;
    parentId: string | null;
    excludeId?: string;
  }) => string | undefined;
  dropTargetId: string | null;
  dropLine: { anchorId: string; edge: 'top' | 'bottom'; depth: number } | null;
}

export const SortableTreeRow = ({ item, handlers }: { item: FlatItem; handlers: TreeHandlers }) => {
  const { formatMessage } = useIntl();

  const renameSelectedRef = useRef(false); // Tracks when the "rename" option is clicked in the popover so Radix's default "restore focus to menu trigger on menu close" behavior doesn't compete with our desired focus on the inline input.

  const { listeners, setNodeRef, isDragging } = useSortable({
    animateLayoutChanges: () => false,
    disabled: !handlers.canEdit,
    id: item.id,
  });

  const dragListeners = handlers.canEdit ? listeners : undefined;

  const depth = item.depth;
  const node = item.node;

  const dropLine =
    handlers.dropLine && handlers.dropLine.anchorId === item.id ? handlers.dropLine : null;

  if (node.type === 'folder' && handlers.canEdit && handlers.editingId === node.id) {
    const validateFolderName = (name: string) => {
      return handlers.validateFolderName({ name, parentId: node.parentId, excludeId: node.id });
    };

    const onFolderNameSubmit = (name: string) => {
      if (name === node.name) {
        handlers.onCancelRename();
        return;
      }

      handlers.onSubmitRename(node.id, name);
    };

    return (
      <div ref={setNodeRef}>
        <FolderNameField
          onCancel={handlers.onCancelRename}
          onSubmit={onFolderNameSubmit}
          validate={validateFolderName}
          defaultValue={node.name}
          depth={item.depth}
        />
      </div>
    );
  }

  const trailingContents = (
    <Flex
      gap={1}
      alignItems="center"
      onPointerDown={(e) => {
        // Prevent propagation when the interactive elements container is clicked as not to compete with the row's drag detection.
        e.stopPropagation();
      }}
    >
      {node.type === 'contentType' && (
        <Box tag="span" textAlign="center" width="24px">
          <Status status={node.status} />
        </Box>
      )}
      {node.type === 'folder' && handlers.canEdit && (
        <Menu.Root>
          <MenuTrigger
            variant="ghost"
            endIcon={null}
            size="S"
            aria-label={formatMessage(
              { id: getTrad('nav.folder.actions-label'), defaultMessage: 'Actions for {name}' },
              { name: node.name }
            )}
          >
            <More aria-hidden focusable={false} />
          </MenuTrigger>
          <Menu.Content
            zIndex={2}
            onCloseAutoFocus={(event) => {
              if (renameSelectedRef.current) {
                event.preventDefault();
              }

              renameSelectedRef.current = false;
            }}
          >
            <Menu.Item
              onSelect={() => {
                renameSelectedRef.current = true;
                handlers.onBeginRename(node.id);
              }}
              startIcon={<Pencil />}
            >
              {formatMessage({ id: getTrad('nav.folder.rename'), defaultMessage: 'Rename' })}
            </Menu.Item>

            <Menu.Separator />
            <Menu.Item
              onSelect={() => handlers.onDeleteFolder(node)}
              startIcon={<Trash />}
              variant="danger"
            >
              {formatMessage({ id: getTrad('nav.folder.delete'), defaultMessage: 'Delete folder' })}
            </Menu.Item>

            {node.children.length > 0 && (
              <Menu.Item
                onSelect={() => handlers.onDeleteFolderAndContent(node)}
                startIcon={<Trash />}
              >
                {formatMessage({
                  id: getTrad('nav.folder.delete-with-content'),
                  defaultMessage: 'Delete folder and contents',
                })}
              </Menu.Item>
            )}
          </Menu.Content>
        </Menu.Root>
      )}
    </Flex>
  );

  return (
    <Row
      ref={setNodeRef}
      {...dragListeners}
      alignItems="center"
      $dropTarget={handlers.dropTargetId === item.id}
      $dragging={isDragging}
      $depth={depth}
    >
      {node.type === 'folder' ? (
        <GrabArea
          type="button"
          onClick={handlers.canToggle ? () => handlers.onToggle(node.id) : undefined}
          style={handlers.canToggle ? undefined : { cursor: 'default' }}
        >
          <Glyph aria-hidden>
            <ChevronDown
              fill="neutral500"
              style={{
                transform: handlers.isCollapsed(node.id) ? 'rotate(-90deg)' : 'none',
                transition: 'transform 0.2s',
              }}
            />
          </Glyph>
          <Label tag="span" textColor="neutral800" fontWeight="semiBold">
            {node.name}
          </Label>
        </GrabArea>
      ) : (
        <ContentTypeLink to={node.to} draggable={false}>
          <Bullet aria-hidden />
          <Label tag="span">{node.title}</Label>
        </ContentTypeLink>
      )}
      {trailingContents}
      {dropLine && (
        <DropIndicator
          $indentDepth={dropLine.depth - item.depth}
          $edge={dropLine.edge}
          aria-hidden
        />
      )}
    </Row>
  );
};

/**
 * This is rendered in place of the actual row when it is being dragged.
 */
export const RowOverlay = ({ item }: { item: FlatItem }) => {
  const { formatMessage } = useIntl();
  const node = item.node;
  const name = node.type === 'folder' ? node.name : node.title;

  return (
    <Row
      style={{ cursor: 'grabbing' }}
      background="neutral0"
      shadow="filterShadow"
      alignItems="center"
      $depth={0}
    >
      <Glyph aria-hidden>
        {node.type === 'folder' ? <ChevronDown fill="neutral500" /> : <Bullet />}
      </Glyph>
      <Label tag="span" fontWeight={node.type === 'folder' ? 'semiBold' : 'regular'}>
        {node.type === 'folder' ? node.name : node.title}
      </Label>
      <VisuallyHidden>
        {formatMessage(
          { id: getTrad('nav.folder.dragging'), defaultMessage: 'Dragging {name}' },
          { name }
        )}
      </VisuallyHidden>
    </Row>
  );
};
