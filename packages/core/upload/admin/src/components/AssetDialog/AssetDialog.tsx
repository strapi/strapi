// TODO: find a better naming convention for the file that was an index file before
import * as React from 'react';

import { Page } from '@strapi/admin/strapi-admin';
import { Badge, Button, Divider, Flex, Loader, Modal, Tabs } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useAssets } from '../../hooks/useAssets';
import { useFolders } from '../../hooks/useFolders';
import { useMediaLibraryPermissions } from '../../hooks/useMediaLibraryPermissions';
import { useModalQueryParams } from '../../hooks/useModalQueryParams';
import { useSelectionState } from '../../hooks/useSelectionState';
import {
  containsAssetFilter,
  getTrad,
  getAllowedFiles,
  moveElement,
  AllowedFiles,
} from '../../utils';
import { EditAssetContent, Asset as EditAsset } from '../EditAssetDialog/EditAssetContent';
import { EditFolderContent } from '../EditFolderDialog/EditFolderDialog';

import {
  BrowseStep,
  FolderWithType,
  FileWithType,
  Filter as BrowseFilter,
} from './BrowseStep/BrowseStep';
import { DialogFooter } from './DialogFooter';
import { SelectedStep } from './SelectedStep/SelectedStep';

import type { File as Asset, FilterCondition, Query } from '../../../../shared/contracts/files';
import type { Folder, FolderDefinition } from '../../../../shared/contracts/folders';
import type { AllowedTypes } from '../AssetCard/AssetCard';

const LoadingBody = styled(Flex)`
  /* 80px are coming from the Tabs component that is not included in the ModalBody */
  min-height: ${() => `calc(60vh + 8rem)`};
`;

export interface FileRow extends Asset {
  folderURL?: string;
  isSelectable?: boolean;
  type?: string;
}

export interface FolderRow extends Folder {
  folderURL?: string;
  isSelectable?: boolean;
  type?: string;
}

interface AssetContentProps {
  allowedTypes?: AllowedTypes[];
  folderId?: number | null;
  onClose: () => void;
  onAddAsset: (arg?: { folderId: number | { id: number } | null | undefined }) => void;
  onAddFolder: ({ folderId }: { folderId: number | { id: number } | null | undefined }) => void;
  onChangeFolder: (folderId: number | null) => void;
  onValidate: (selectedAssets: Asset[]) => void;
  multiple?: boolean;
  trackedLocation?: string;
  initiallySelectedAssets?: Asset[];
}

export const AssetContent = ({
  allowedTypes = [],
  folderId = null,
  onClose,
  onAddAsset,
  onAddFolder,
  onChangeFolder,
  onValidate,
  multiple = false,
  initiallySelectedAssets = [],
  trackedLocation,
}: AssetContentProps) => {
  const [assetToEdit, setAssetToEdit] = React.useState<FileWithType | undefined>(undefined);
  const [folderToEdit, setFolderToEdit] = React.useState<FolderRow | undefined>(undefined);
  const { formatMessage } = useIntl();
  const {
    canRead,
    canCreate,
    isLoading: isLoadingPermissions,
    canUpdate,
    canCopyLink,
    canDownload,
  } = useMediaLibraryPermissions();

  const [
    { queryObject },
    {
      onChangeFilters,
      onChangePage,
      onChangePageSize,
      onChangeSort,
      onChangeSearch,
      onChangeFolder: onChangeFolderParam,
    },
  ] = useModalQueryParams({ folder: folderId });

  const {
    data: { pagination, results: assets } = {},
    isLoading: isLoadingAssets,
    error: errorAssets,
  } = useAssets({ skipWhen: !canRead, query: queryObject });

  const {
    data: folders,
    isLoading: isLoadingFolders,
    error: errorFolders,
  } = useFolders({
    enabled: canRead && !containsAssetFilter(queryObject!) && pagination?.page === 1,
    query: queryObject,
  });

  const [
    selectedAssets,
    { selectOne, selectOnly, setSelections, selectMultiple, deselectMultiple },
  ] = useSelectionState(['id'], initiallySelectedAssets);

  const handleSelectAllAssets = () => {
    const allowedAssets = getAllowedFiles(allowedTypes, assets as AllowedFiles[]);

    if (!multiple) {
      return undefined;
    }

    // selected files in current folder
    const alreadySelected = allowedAssets.filter(
      (asset) => selectedAssets.findIndex((selectedAsset) => selectedAsset.id === asset.id) !== -1
    );

    if (alreadySelected.length > 0) {
      deselectMultiple(alreadySelected);
    } else {
      selectMultiple(allowedAssets);
    }
  };

  const handleSelectAsset = (asset: Asset | FileRow | FolderRow) => {
    return multiple ? selectOne(asset as Asset) : selectOnly(asset as Asset);
  };

  const isLoading = isLoadingPermissions || isLoadingAssets || isLoadingFolders;
  const hasError = errorAssets || errorFolders;

  if (isLoading) {
    return (
      <>
        <Modal.Header>
          <Modal.Title>
            {formatMessage({
              id: getTrad('header.actions.add-assets'),
              defaultMessage: 'Add new assets',
            })}
          </Modal.Title>
        </Modal.Header>
        <LoadingBody justifyContent="center" paddingTop={4} paddingBottom={4}>
          <Loader>
            {formatMessage({
              id: getTrad('content.isLoading'),
              defaultMessage: 'Content is loading.',
            })}
          </Loader>
        </LoadingBody>
        <DialogFooter onClose={onClose} />
      </>
    );
  }

  if (hasError) {
    return (
      <>
        <Modal.Header>
          <Modal.Title>
            {formatMessage({
              id: getTrad('header.actions.add-assets'),
              defaultMessage: 'Add new assets',
            })}
          </Modal.Title>
        </Modal.Header>
        <Page.Error />
        <DialogFooter onClose={onClose} />
      </>
    );
  }

  if (!canRead) {
    return (
      <>
        <Modal.Header>
          <Modal.Title>
            {formatMessage({
              id: getTrad('header.actions.add-assets'),
              defaultMessage: 'Add new assets',
            })}
          </Modal.Title>
        </Modal.Header>
        <Page.NoPermissions />
        <DialogFooter onClose={onClose} />
      </>
    );
  }

  if (assetToEdit) {
    return (
      <EditAssetContent
        onClose={() => setAssetToEdit(undefined)}
        asset={assetToEdit as EditAsset}
        canUpdate={canUpdate}
        canCopyLink={canCopyLink}
        canDownload={canDownload}
        trackedLocation={trackedLocation}
      />
    );
  }

  if (folderToEdit) {
    return (
      <EditFolderContent
        folder={folderToEdit as FolderDefinition}
        onClose={() => setFolderToEdit(undefined)}
        location="content-manager"
        parentFolderId={queryObject?.folder as string | number | null | undefined}
      />
    );
  }

  const handleMoveItem = (hoverIndex: number, destIndex: number) => {
    const offset = destIndex - hoverIndex;
    const orderedAssetsClone = selectedAssets.slice();
    const nextAssets = moveElement<Asset>(orderedAssetsClone, hoverIndex, offset);
    setSelections(nextAssets);
  };

  const handleFolderChange = (folderId: number, folderPath?: string) => {
    onChangeFolder(folderId);
    if (onChangeFolderParam) {
      onChangeFolderParam(folderId, folderPath);
    }
  };

  return (
    <>
      <Modal.Header>
        <Modal.Title>
          {formatMessage({
            id: getTrad('header.actions.add-assets'),
            defaultMessage: 'Add new assets',
          })}
        </Modal.Title>
      </Modal.Header>

      <TabsRoot variant="simple" defaultValue={selectedAssets.length > 0 ? 'selected' : 'browse'}>
        <Flex paddingLeft={8} paddingRight={8} paddingTop={6} justifyContent="space-between">
          <Tabs.List>
            <Tabs.Trigger value="browse">
              {formatMessage({
                id: getTrad('modal.nav.browse'),
                defaultMessage: 'Browse',
              })}
            </Tabs.Trigger>
            <Tabs.Trigger value="selected">
              {formatMessage({
                id: getTrad('modal.header.select-files'),
                defaultMessage: 'Selected files',
              })}
              <Badge marginLeft={2}>{selectedAssets.length}</Badge>
            </Tabs.Trigger>
          </Tabs.List>
          <Flex gap={2}>
            <Button
              variant="secondary"
              onClick={() => onAddFolder({ folderId: queryObject?.folder })}
            >
              {formatMessage({
                id: getTrad('modal.upload-list.sub-header.add-folder'),
                defaultMessage: 'Add folder',
              })}
            </Button>
            <Button onClick={() => onAddAsset({ folderId: queryObject?.folder })}>
              {formatMessage({
                id: getTrad('modal.upload-list.sub-header.button'),
                defaultMessage: 'Add more assets',
              })}
            </Button>
          </Flex>
        </Flex>
        <Divider />
        <Modal.Body>
          <Tabs.Content value="browse">
            <BrowseStep
              allowedTypes={allowedTypes}
              assets={assets!}
              canCreate={canCreate}
              canRead={canRead}
              folders={folders as FolderWithType[]}
              onSelectAsset={handleSelectAsset}
              selectedAssets={selectedAssets}
              multiple={multiple}
              onSelectAllAsset={handleSelectAllAssets}
              onEditAsset={setAssetToEdit}
              onEditFolder={setFolderToEdit}
              pagination={pagination!}
              queryObject={queryObject!}
              onAddAsset={onAddAsset}
              onChangeFilters={(filters: FilterCondition<string>[] | BrowseFilter[]) =>
                onChangeFilters!(filters as FilterCondition<string>[])
              }
              onChangeFolder={handleFolderChange}
              onChangePage={onChangePage!}
              onChangePageSize={onChangePageSize!}
              onChangeSort={(sort: string | undefined) => onChangeSort!(sort as Query['sort'])}
              onChangeSearch={onChangeSearch!}
            />
          </Tabs.Content>
          <Tabs.Content value="selected">
            <SelectedStep
              selectedAssets={selectedAssets}
              onSelectAsset={handleSelectAsset}
              onReorderAsset={handleMoveItem}
            />
          </Tabs.Content>
        </Modal.Body>
      </TabsRoot>
      <DialogFooter onClose={onClose} onValidate={() => onValidate(selectedAssets)} />
    </>
  );
};

interface AssetDialogProps extends AssetContentProps {
  open?: boolean;
}

export const AssetDialog = ({ open = false, onClose, ...restProps }: AssetDialogProps) => {
  return (
    <Modal.Root open={open} onOpenChange={onClose}>
      <Modal.Content>
        <AssetContent onClose={onClose} {...restProps} />
      </Modal.Content>
    </Modal.Root>
  );
};

const TabsRoot = styled(Tabs.Root)`
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;
