// TODO: find a better naming convention for the file that was an index file before
import * as React from 'react';

import { AssetDialog } from '../AssetDialog/AssetDialog';
import { EditFolderDialog } from '../EditFolderDialog/EditFolderDialog';
import { UploadAssetDialog } from '../UploadAssetDialog/UploadAssetDialog';

const STEPS = {
  AssetSelect: 'SelectAsset',
  AssetUpload: 'UploadAsset',
  FolderCreate: 'FolderCreate',
};

import type { File } from '../../../../shared/contracts/files';
import type { AllowedTypes } from '../AssetCard/AssetCard';
export interface MediaLibraryDialogProps {
  allowedTypes?: AllowedTypes[];
  onClose: () => void;
  onSelectAssets: (selectedAssets: File[]) => void;
}

export const MediaLibraryDialog = ({
  onClose,
  onSelectAssets,
  allowedTypes = ['files', 'images', 'videos', 'audios'],
}: MediaLibraryDialogProps) => {
  const [step, setStep] = React.useState(STEPS.AssetSelect);
  const [folder, setFolder] = React.useState<{
    folderId: number;
    folderPath?: string;
  } | null>(null);

  switch (step) {
    case STEPS.AssetSelect:
      return (
        <AssetDialog
          allowedTypes={allowedTypes}
          folderId={folder?.folderId}
          folderPath={folder?.folderPath}
          open
          onClose={onClose}
          onValidate={onSelectAssets}
          onAddAsset={() => setStep(STEPS.AssetUpload)}
          onAddFolder={() => setStep(STEPS.FolderCreate)}
          onChangeFolder={setFolder}
          multiple
        />
      );

    case STEPS.FolderCreate:
      return (
        <EditFolderDialog
          open
          onClose={() => setStep(STEPS.AssetSelect)}
          parentFolderId={folder?.folderId}
        />
      );

    default:
      return (
        <UploadAssetDialog
          open
          onClose={() => setStep(STEPS.AssetSelect)}
          folderId={folder?.folderId}
        />
      );
  }
};
