import * as React from 'react';

import { Modal } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { EditAssetContent } from '../EditAssetDialog/EditAssetContent';

import { AddAssetStep } from './AddAssetStep/AddAssetStep';
import { PendingAssetStep } from './PendingAssetStep/PendingAssetStep';

import type { File, RawFile } from '../../../../shared/contracts/files';
import type { AllowedFiles } from '../../utils';

const Steps = {
  AddAsset: 'AddAsset',
  PendingAsset: 'PendingAsset',
};

interface FileWithRawFile extends Omit<File, 'id' | 'hash'> {
  id?: string;
  hash?: string;
  rawFile: RawFile;
}

type FileWithoutIdHash = Omit<File, 'id' | 'hash'>;

export interface Asset extends Omit<File, 'folder'> {
  isLocal?: boolean;
  rawFile?: RawFile;
  folder?: File['folder'] & { id: number };
}

export interface UploadAssetDialogProps {
  addUploadedFiles?: (files: Asset[] | File[]) => void;
  folderId?: string | number | null;
  initialAssetsToAdd?: Asset[];
  onClose: () => void;
  open: boolean;
  trackedLocation?: string;
  validateAssetsTypes?: (
    assets: FileWithoutIdHash[] | Asset[],
    cb: (assets?: AllowedFiles[], error?: string) => void
  ) => void;
}

export const UploadAssetDialog = ({
  initialAssetsToAdd,
  folderId = null,
  onClose = () => {},
  addUploadedFiles,
  trackedLocation,
  open,
  validateAssetsTypes = (_, cb) => cb(),
}: UploadAssetDialogProps) => {
  const { formatMessage } = useIntl();
  const [step, setStep] = React.useState(initialAssetsToAdd ? Steps.PendingAsset : Steps.AddAsset);
  const [assets, setAssets] = React.useState(initialAssetsToAdd || []);
  const [assetToEdit, setAssetToEdit] = React.useState<File | Asset | undefined>(undefined);

  const handleAddToPendingAssets = (nextAssets: Asset[]) => {
    validateAssetsTypes(nextAssets, () => {
      setAssets((prevAssets) => prevAssets.concat(nextAssets));
      setStep(Steps.PendingAsset);
    });
  };

  const moveToAddAsset = () => {
    setStep(Steps.AddAsset);
  };

  const handleCancelUpload = (file: RawFile) => {
    const nextAssets = assets.filter((asset) => asset.rawFile !== file);
    setAssets(nextAssets);

    // When there's no asset, transition to the AddAsset step
    if (nextAssets.length === 0) {
      moveToAddAsset();
    }
  };

  const handleUploadSuccess = (file: RawFile) => {
    const nextAssets = assets.filter((asset) => asset.rawFile !== file);
    setAssets(nextAssets);

    if (nextAssets.length === 0) {
      onClose();
    }
  };

  const handleAssetEditValidation = (nextAsset?: Asset | boolean | null) => {
    if (nextAsset && typeof nextAsset !== 'boolean') {
      const nextAssets = assets.map((asset) => (asset === assetToEdit ? nextAsset : asset));
      setAssets(nextAssets);
    }

    setAssetToEdit(undefined);
  };

  const handleClose = () => {
    if (step === Steps.PendingAsset && assets.length > 0) {
      // eslint-disable-next-line no-alert
      const confirm = window.confirm(
        formatMessage({
          id: 'window.confirm.close-modal.files',
          defaultMessage: 'Are you sure? You have some files that have not been uploaded yet.',
        })
      );

      if (confirm) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleRemoveAsset = (assetToRemove: File) => {
    const nextAssets = assets.filter((asset) => asset !== assetToRemove);
    setAssets(nextAssets);
  };

  return (
    <Modal.Root open={open} onOpenChange={handleClose}>
      {step === Steps.AddAsset && (
        <Modal.Content>
          <AddAssetStep
            onClose={onClose}
            onAddAsset={(assets: FileWithRawFile[]) =>
              handleAddToPendingAssets(assets as unknown as Asset[])
            }
            trackedLocation={trackedLocation}
          />
        </Modal.Content>
      )}

      {step === Steps.PendingAsset && (
        <Modal.Content>
          <PendingAssetStep
            onClose={handleClose}
            assets={assets}
            onEditAsset={setAssetToEdit}
            onRemoveAsset={handleRemoveAsset}
            onClickAddAsset={moveToAddAsset}
            onCancelUpload={handleCancelUpload}
            onUploadSucceed={handleUploadSuccess}
            initialAssetsToAdd={initialAssetsToAdd}
            addUploadedFiles={addUploadedFiles}
            folderId={folderId}
            trackedLocation={trackedLocation}
          />
        </Modal.Content>
      )}

      {assetToEdit && (
        <Modal.Content>
          <EditAssetContent
            onClose={handleAssetEditValidation}
            asset={assetToEdit as Asset}
            canUpdate
            canCopyLink={false}
            canDownload={false}
            trackedLocation={trackedLocation}
          />
        </Modal.Content>
      )}
    </Modal.Root>
  );
};
