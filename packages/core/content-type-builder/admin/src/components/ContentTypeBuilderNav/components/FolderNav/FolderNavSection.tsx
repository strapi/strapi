import { useMemo, useState } from 'react';

import { DndContext, DragOverlay } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { SubNav } from '@strapi/admin/strapi-admin';
import { Box, useCollator, useFilter } from '@strapi/design-system';
import { File, Folder } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { getTrad } from '../../../../utils/getTrad';
import { useDataManager } from '../../../DataManager/useDataManager';
import { isFolderNameTakenBySibling } from '../../../DataManager/utils/contentStructure';
import { useFolderActions } from '../../hooks/useFolderActions';
import { useSortableTree } from '../../hooks/useSortableTree';
import {
  buildSectionTree,
  collectSubtreeContentTypeUids,
  countSubtree,
  filterTree,
} from '../../lib/buildFolderTree';
import { flattenSortableTree } from '../../lib/flatModel';

import { DeleteFolderDialog } from './DeleteFolderDialog';
import { FolderNameField } from './FolderNameField';
import { RowOverlay, SortableTreeRow } from './SortableTreeRow';

import type { DeleteFolderMode } from './DeleteFolderDialog';
import type { TreeHandlers } from './SortableTreeRow';
import type { SectionKey } from '../../../DataManager/utils/contentStructure';
import type { ContentTypeLink, FolderNode, FolderTreeNode } from '../../lib/buildFolderTree';

const countContentTypes = (nodes: FolderTreeNode[]): number => {
  return nodes.reduce((total, node) => {
    if (node.type === 'folder') {
      return total + countContentTypes(node.children);
    }

    return total + 1;
  }, 0);
};

interface FolderNavSectionProps {
  onCreateContentType: () => void;
  createTypeLabel: string;
  searchValue: string;

  /** Guided-tour section id ('models' | 'singleTypes'). */
  sectionId: string;
  section: SectionKey;

  title: string;
  links: ContentTypeLink[];
}

export const FolderNavSection = ({
  onCreateContentType,
  createTypeLabel,
  searchValue,
  sectionId,
  section,
  title,
  links,
}: FolderNavSectionProps) => {
  const { contentStructure, isInDevelopmentMode } = useDataManager();
  const { formatMessage, locale } = useIntl();
  const actions = useFolderActions();

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDrafting, setIsDrafting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    mode: DeleteFolderMode;
    node: FolderNode;
  } | null>(null);

  const { contains } = useFilter(locale, { sensitivity: 'base' });
  const formatter = useCollator(locale, { sensitivity: 'base' });

  const sectionData = contentStructure.sections[section];
  const searchActive = searchValue.trim().length > 0;
  const canEdit = Boolean(isInDevelopmentMode);

  const linkUids = useMemo(() => {
    return new Set(links.map((link) => link.uid));
  }, [links]);

  const tree = useMemo(() => {
    return buildSectionTree(sectionData, links, (a, b) => formatter.compare(a, b));
  }, [sectionData, links, formatter]);

  const visibleTree = useMemo(() => {
    return searchActive ? filterTree(tree, (text) => contains(text, searchValue)) : tree;
  }, [searchActive, tree, contains, searchValue]);

  const flatItems = useMemo(() => {
    return flattenSortableTree(visibleTree, collapsed);
  }, [visibleTree, collapsed]);

  // This hook supplies the CTB contentStructure dnd engine.
  const dnd = useSortableTree({
    disabled: !canEdit,
    items: flatItems,
    collapsed,
    onDrop: (activeNode, target) => {
      const parentId = target.kind === 'nest' ? target.folderId : target.parentId;
      const index = target.kind === 'nest' ? 0 : target.index;

      if (activeNode.type === 'folder') {
        actions.moveFolder({
          newParentId: parentId,
          index,
          id: activeNode.id,
          section,
        });

        return;
      }

      actions.assignContentTypeToFolder({
        targetGroupId: parentId,
        index,
        uid: activeNode.uid,
        section,
      });
    },
    onExpandFolder: (folderId) =>
      setCollapsed((prev) => {
        const next = new Set(prev);
        next.delete(folderId);
        return next;
      }),
  });

  const confirmDelete = () => {
    if (!deleteTarget) {
      return;
    }

    if (deleteTarget.mode === 'withContent') {
      actions.deleteFolderAndContent({
        contentTypeUids: collectSubtreeContentTypeUids(sectionData, deleteTarget.node.id).filter(
          (uid) => linkUids.has(uid)
        ),
        id: deleteTarget.node.id,
        section,
      });
    } else {
      actions.deleteFolderOnly({ section, id: deleteTarget.node.id });
    }

    setDeleteTarget(null);
  };

  const validateFolderName = ({
    excludeId,
    parentId,
    name,
  }: {
    excludeId?: string;
    parentId: string | null;
    name: string;
  }): string | undefined => {
    const folderNameTaken = isFolderNameTakenBySibling(
      sectionData.groups,
      parentId,
      name,
      excludeId
    );

    if (folderNameTaken) {
      return formatMessage({
        id: getTrad('nav.folder.name.duplicate'),
        defaultMessage: 'A folder with this name already exists in this location',
      });
    }

    return undefined;
  };

  const handlers: TreeHandlers = {
    dropTargetId: dnd.dropTargetId,
    dropLine: dnd.dropLine,
    validateFolderName,
    editingId,
    section,
    canEdit,

    isCollapsed: (id) => {
      return collapsed.has(id);
    },
    onToggle: (id) => {
      setCollapsed((prev) => {
        const next = new Set(prev);

        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }

        return next;
      });
    },
    // Deferred past the closing menu's focus restoration so the inline input isn't blurred (and consequently auto-committed) the instant it mounts.
    onBeginRename: (id) => {
      setTimeout(() => {
        setIsDrafting(false);
        setEditingId(id);
      }, 0);
    },
    onSubmitRename: (id, name) => {
      actions.renameFolder({ section, id, name });
      setEditingId(null);
    },
    onCancelRename: () => {
      setEditingId(null);
    },
    onDeleteFolder: (node) => {
      setDeleteTarget({ node, mode: 'only' });
    },
    onDeleteFolderAndContent: (node) => {
      setDeleteTarget({ node, mode: 'withContent' });
    },
    countFolderSubtree: (id) => {
      return countSubtree(sectionData, id, linkUids);
    },
  };

  const sectionLink = {
    label: createTypeLabel,
    // The "New folder" option mounts the folder name input input and focuses it. Without this flag enabled, closing the menu would restore focus to the menu icon trigger.
    suppressFocusCaptureOnMenuClose: true,
    menu: [
      { label: createTypeLabel, onSelect: onCreateContentType, startIcon: <File /> },
      {
        label: formatMessage({
          id: getTrad('nav.action.new-folder'),
          defaultMessage: 'New folder',
        }),
        onSelect: () => {
          setEditingId(null);
          setTimeout(() => setIsDrafting(true), 0);
        },
        startIcon: <Folder />,
      },
    ],
  };

  const rows = (
    // No extra horizontal padding here — the rows sit directly in the section's
    // list so their left edge lines up with the components SubSections.
    <Box key="section-rows">
      {canEdit && isDrafting && (
        <FolderNameField
          depth={0}
          defaultValue={formatMessage({
            id: getTrad('nav.folder.default-name'),
            defaultMessage: 'New folder',
          })}
          validate={(name) => {
            return validateFolderName({ name, parentId: null });
          }}
          onSubmit={(name) => {
            actions.createFolder({ section, name, parentId: null });
            setIsDrafting(false);
          }}
          onCancel={() => {
            setIsDrafting(false);
          }}
        />
      )}
      <DndContext
        collisionDetection={dnd.collisionDetection}
        onDragCancel={dnd.onDragCancel}
        onDragStart={dnd.onDragStart}
        onDragMove={dnd.onDragMove}
        onDragEnd={dnd.onDragEnd}
        sensors={dnd.sensors}
      >
        <SortableContext
          items={dnd.renderedItems.map((item) => item.id)}
          strategy={dnd.sortingStrategy}
        >
          {dnd.renderedItems.map((item) => {
            return <SortableTreeRow key={item.id} item={item} handlers={handlers} />;
          })}
        </SortableContext>
        <DragOverlay dropAnimation={null}>
          {dnd.activeItem ? <RowOverlay item={dnd.activeItem} /> : null}
        </DragOverlay>
      </DndContext>
    </Box>
  );

  return (
    <>
      <SubNav.Section
        badgeLabel={countContentTypes(visibleTree).toString()}
        link={canEdit ? sectionLink : undefined}
        sectionId={sectionId}
        label={title}
      >
        {[rows]}
      </SubNav.Section>

      {deleteTarget && (
        <DeleteFolderDialog
          counts={countSubtree(sectionData, deleteTarget.node.id, linkUids)}
          folderName={deleteTarget.node.name}
          onConfirm={confirmDelete}
          mode={deleteTarget.mode}
          open
          onOpenChange={(open) => {
            if (!open) {
              setDeleteTarget(null);
            }
          }}
        />
      )}
    </>
  );
};
