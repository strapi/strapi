import * as React from 'react';

import { useStrapiApp } from '@strapi/admin/strapi-admin';
import { Menu, Modal } from '@strapi/design-system';

import { pluginId } from './pluginId';

import type { File } from '../../shared/contracts/files';
import type { Folder } from '../../shared/contracts/folders';
import type { DescriptionComponent, InfoItemDescription } from '@strapi/admin/strapi-admin';

/* -------------------------------------------------------------------------------------------------
 * Types, copied from the Content Manager's `BulkActionDescription` and its `ModalOptions`
 * -----------------------------------------------------------------------------------------------*/

// The CM's `DialogOptions` can join this union when an action needs a confirm dialog
interface ModalOptions {
  type: 'modal';
  title: string;
  content: React.ComponentType<{ onClose: () => void }> | React.ReactNode;
}

interface MediaActionDescription {
  label: string;
  icon?: React.ReactNode;
  /**
   * @default 'default'
   */
  variant?: 'default' | 'danger';
  disabled?: boolean;
  onClick?: () => void;
  dialog?: ModalOptions;
}

type FolderAction = DescriptionComponent<
  { folder: Pick<Folder, 'id' | 'name' | 'readOnly'> },
  MediaActionDescription
>;
type FolderInfo = DescriptionComponent<
  { folder: Pick<Folder, 'id' | 'name' | 'readOnly'> },
  InfoItemDescription
>;
type AssetInfo = DescriptionComponent<{ asset: Omit<File, 'createdBy'> }, InfoItemDescription>;
type AssetAction = DescriptionComponent<{ asset: File }, MediaActionDescription>;

/** The files and folders that a bulk action, a move or a delete acts on */
interface MediaItems {
  fileIds: number[];
  folderIds: number[];
}

type BulkAction = DescriptionComponent<{ items: MediaItems }, MediaActionDescription>;
/** Shown in the move or delete dialog, before the user confirms */
type ItemsInfo = DescriptionComponent<{ items: MediaItems }, InfoItemDescription>;

/* -------------------------------------------------------------------------------------------------
 * Registry, added with `app.getPlugin('upload').apis.addFolderAction([...])` in `bootstrap`
 * -----------------------------------------------------------------------------------------------*/

const createMediaLibraryApis = () => {
  const folderActions: FolderAction[] = [];
  const folderInfo: FolderInfo[] = [];
  const assetInfo: AssetInfo[] = [];
  const assetActions: AssetAction[] = [];
  const bulkActions: BulkAction[] = [];
  const moveInfo: ItemsInfo[] = [];
  const deleteInfo: ItemsInfo[] = [];

  return {
    addFolderAction: (actions: FolderAction[]) => void folderActions.push(...actions),
    addFolderInfo: (items: FolderInfo[]) => void folderInfo.push(...items),
    addAssetInfo: (items: AssetInfo[]) => void assetInfo.push(...items),
    addAssetAction: (actions: AssetAction[]) => void assetActions.push(...actions),
    addBulkAction: (actions: BulkAction[]) => void bulkActions.push(...actions),
    addMoveInfo: (items: ItemsInfo[]) => void moveInfo.push(...items),
    addDeleteInfo: (items: ItemsInfo[]) => void deleteInfo.push(...items),
    getFolderActions: () => folderActions,
    getFolderInfo: () => folderInfo,
    getAssetInfo: () => assetInfo,
    getAssetActions: () => assetActions,
    getBulkActions: () => bulkActions,
    getMoveInfo: () => moveInfo,
    getDeleteInfo: () => deleteInfo,
  };
};

type MediaLibraryApis = ReturnType<typeof createMediaLibraryApis>;

const EMPTY_APIS = createMediaLibraryApis();

const useMediaLibraryApis = (): MediaLibraryApis => {
  const getPlugin = useStrapiApp('MediaLibraryApis', (state) => state.getPlugin);

  // `apis` is typed as a plain record on every plugin
  return (getPlugin?.(pluginId)?.apis as MediaLibraryApis | undefined) ?? EMPTY_APIS;
};

/* -------------------------------------------------------------------------------------------------
 * ActionDialog, the modal frame core draws around an action's content
 * -----------------------------------------------------------------------------------------------*/

const ActionDialog = ({ dialog, onClose }: { dialog: ModalOptions; onClose: () => void }) => {
  const { content: Content } = dialog;

  return (
    <Modal.Root open onOpenChange={onClose}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>{dialog.title}</Modal.Title>
        </Modal.Header>
        {typeof Content === 'function' ? (
          <Content onClose={onClose} />
        ) : (
          <Modal.Body>{Content}</Modal.Body>
        )}
      </Modal.Content>
    </Modal.Root>
  );
};

type Resolved = MediaActionDescription & { id: string };

/** Plugin actions as menu items. `onOpen` gets the id of an action that has a dialog */
const ActionMenuItems = ({
  actions,
  onOpen,
}: {
  actions: Resolved[];
  onOpen: (id: string) => void;
}) =>
  actions.map((action) => (
    <Menu.Item
      key={action.id}
      startIcon={action.icon}
      variant={action.variant}
      disabled={action.disabled}
      onSelect={() => {
        action.onClick?.();
        if (action.dialog) {
          onOpen(action.id);
        }
      }}
    >
      {action.label}
    </Menu.Item>
  ));

/** The dialog of the open plugin action, if it has one */
const ActionDialogs = ({
  actions,
  openId,
  onClose,
}: {
  actions: Resolved[];
  openId: string | null;
  onClose: () => void;
}) =>
  actions.map(
    ({ id, dialog }) =>
      id === openId && dialog && <ActionDialog key={id} dialog={dialog} onClose={onClose} />
  );

export {
  ActionDialog,
  ActionDialogs,
  ActionMenuItems,
  createMediaLibraryApis,
  useMediaLibraryApis,
};
export type {
  AssetAction,
  AssetInfo,
  BulkAction,
  FolderAction,
  FolderInfo,
  ItemsInfo,
  MediaActionDescription,
  MediaItems,
  MediaLibraryApis,
};
