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

const DEFAULT_ALLOWED_TYPES: NonNullable<MediaLibraryDialogProps['allowedTypes']> = [
  'files',
  'images',
  'videos',
  'audios',
];
const EMPTY_INITIALLY_SELECTED_ASSETS: NonNullable<
  MediaLibraryDialogProps['initiallySelectedAssets']
> = [];
export interface MediaLibraryDialogProps {
  allowedTypes?: AllowedTypes[];
  multiple?: boolean;
  initiallySelectedAssets?: File[];
  onClose: () => void;
  onSelectAssets: (selectedAssets: File[]) => void;
}

export const MediaLibraryDialog = ({
  onClose,
  onSelectAssets,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  multiple = true,
  initiallySelectedAssets = EMPTY_INITIALLY_SELECTED_ASSETS,
}: MediaLibraryDialogProps) => {
  const [step, setStep] = React.useState(STEPS.AssetSelect);
  const [folderId, setFolderId] = React.useState<number | null>(null);

  switch (step) {
    case STEPS.AssetSelect:
      return (
        <AssetDialog
          allowedTypes={allowedTypes}
          folderId={folderId}
          open
          onClose={onClose}
          onValidate={onSelectAssets}
          initiallySelectedAssets={initiallySelectedAssets}
          onAddAsset={() => setStep(STEPS.AssetUpload)}
          onAddFolder={() => setStep(STEPS.FolderCreate)}
          onChangeFolder={(folderId) => setFolderId(folderId)}
          multiple={multiple}
        />
      );

    case STEPS.FolderCreate:
      return (
        <EditFolderDialog
          open
          onClose={() => setStep(STEPS.AssetSelect)}
          parentFolderId={folderId}
        />
      );

    default:
      return (
        <UploadAssetDialog open onClose={() => setStep(STEPS.AssetSelect)} folderId={folderId} />
      );
  }
};
