// TODO: find a better naming convention for the file that was an index file before
import * as React from 'react';

import { useField, useNotification } from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';

import { getTrad, getAllowedFiles, AllowedFiles } from '../../utils';
import { AssetDialog } from '../AssetDialog/AssetDialog';
import { EditFolderDialog } from '../EditFolderDialog/EditFolderDialog';
import { UploadAssetDialog, Asset } from '../UploadAssetDialog/UploadAssetDialog';

import { CarouselAssets, CarouselAssetsProps, FileWithoutIdHash } from './Carousel/CarouselAssets';

import type { File } from '../../../../shared/contracts/files';
type AllowedTypes = 'files' | 'images' | 'videos' | 'audios';

const STEPS = {
  AssetSelect: 'SelectAsset',
  AssetUpload: 'UploadAsset',
  FolderCreate: 'FolderCreate',
};

export interface MediaLibraryInputProps {
  required?: boolean;
  name: string;
  labelAction?: React.ReactNode;
  label?: string;
  hint?: string;
  disabled?: boolean;
  attribute?: {
    allowedTypes?: AllowedTypes[];
    multiple?: boolean;
  };
}

export const MediaLibraryInput = React.forwardRef<CarouselAssetsProps, MediaLibraryInputProps>(
  (
    {
      attribute: { allowedTypes = ['videos', 'files', 'images', 'audios'], multiple = false } = {},
      label,
      hint,
      disabled = false,
      labelAction = undefined,
      name,
      required = false,
    },
    forwardedRef
  ) => {
    const { formatMessage } = useIntl();
    const { onChange, value, error } = useField(name);
    const fieldAllowedTypes = allowedTypes || ['files', 'images', 'videos', 'audios'];
    const [uploadedFiles, setUploadedFiles] = React.useState<Asset[] | File[]>([]);
    const [step, setStep] = React.useState<string | undefined>(undefined);
    const [selectedIndex, setSelectedIndex] = React.useState(0);
    const [droppedAssets, setDroppedAssets] = React.useState<AllowedFiles[]>();
    const [folderId, setFolderId] = React.useState<number | null>(null);
    const { toggleNotification } = useNotification();

    React.useEffect(() => {
      // Clear the uploaded files on close
      if (step === undefined) {
        setUploadedFiles([]);
      }
    }, [step]);

    let selectedAssets: File[] = [];

    if (Array.isArray(value)) {
      selectedAssets = value;
    } else if (value) {
      selectedAssets = [value];
    }

    const handleValidation = (nextSelectedAssets: File[]) => {
      const value = multiple ? nextSelectedAssets : nextSelectedAssets[0];
      onChange(name, value);
      setStep(undefined);
    };

    const handleDeleteAssetFromMediaLibrary = () => {
      let nextValue;

      if (multiple) {
        const nextSelectedAssets = selectedAssets.filter(
          (_, assetIndex) => assetIndex !== selectedIndex
        );
        nextValue = nextSelectedAssets.length > 0 ? nextSelectedAssets : null;
      } else {
        nextValue = null;
      }

      const value = nextValue;
      onChange(name, value);

      setSelectedIndex(0);
    };

    const handleDeleteAsset = (asset: File) => {
      let nextValue;

      if (multiple) {
        const nextSelectedAssets = selectedAssets.filter((prevAsset) => prevAsset.id !== asset.id);

        nextValue = nextSelectedAssets.length > 0 ? nextSelectedAssets : null;
      } else {
        nextValue = null;
      }

      onChange(name, nextValue);

      setSelectedIndex(0);
    };

    const handleAssetEdit = (asset: File) => {
      const nextSelectedAssets = selectedAssets.map((prevAsset) =>
        prevAsset.id === asset.id ? asset : prevAsset
      );

      onChange(name, multiple ? nextSelectedAssets : nextSelectedAssets[0]);
    };

    const validateAssetsTypes = (
      assets: FileWithoutIdHash[] | Asset[],
      callback: (assets?: AllowedFiles[], error?: string) => void
    ) => {
      const allowedAssets = getAllowedFiles(fieldAllowedTypes, assets as AllowedFiles[]);

      if (allowedAssets.length > 0) {
        callback(allowedAssets);
      } else {
        toggleNotification({
          type: 'danger',
          timeout: 4000,
          message: formatMessage(
            {
              id: getTrad('input.notification.not-supported'),
              defaultMessage: `You can't upload this type of file.`,
            },
            {
              fileTypes: fieldAllowedTypes.join(','),
            }
          ),
        });
      }
    };

    const handleAssetDrop = (assets: FileWithoutIdHash[]) => {
      validateAssetsTypes(assets, (allowedAssets?: AllowedFiles[]) => {
        setDroppedAssets(allowedAssets);
        setStep(STEPS.AssetUpload);
      });
    };

    if (multiple && selectedAssets.length > 0) {
      label = `${label} (${selectedIndex + 1} / ${selectedAssets.length})`;
    }

    const handleNext = () => {
      setSelectedIndex((current) => (current < selectedAssets.length - 1 ? current + 1 : 0));
    };

    const handlePrevious = () => {
      setSelectedIndex((current) => (current > 0 ? current - 1 : selectedAssets.length - 1));
    };

    const handleFilesUploadSucceeded = (uploadedFiles: Asset[] | File[]) => {
      setUploadedFiles((prev) => [...prev, ...uploadedFiles]);
    };

    let initiallySelectedAssets = selectedAssets;

    if (uploadedFiles.length > 0) {
      const allowedUploadedFiles = getAllowedFiles(
        fieldAllowedTypes,
        uploadedFiles as AllowedFiles[]
      );

      initiallySelectedAssets = multiple
        ? [...allowedUploadedFiles, ...selectedAssets]
        : [allowedUploadedFiles[0]];
    }

    return (
      <>
        <CarouselAssets
          ref={forwardedRef}
          assets={selectedAssets}
          disabled={disabled}
          label={label!}
          labelAction={labelAction}
          onDeleteAsset={handleDeleteAsset}
          onDeleteAssetFromMediaLibrary={handleDeleteAssetFromMediaLibrary}
          onAddAsset={() => setStep(STEPS.AssetSelect)}
          onDropAsset={handleAssetDrop}
          onEditAsset={handleAssetEdit}
          onNext={handleNext}
          onPrevious={handlePrevious}
          error={error}
          hint={hint}
          required={required}
          selectedAssetIndex={selectedIndex}
          trackedLocation="content-manager"
        />

        {step === STEPS.AssetSelect && (
          <AssetDialog
            allowedTypes={fieldAllowedTypes as AllowedTypes[]}
            initiallySelectedAssets={initiallySelectedAssets}
            folderId={folderId}
            onClose={() => {
              setStep(undefined);
              setFolderId(null);
            }}
            open={step === STEPS.AssetSelect}
            onValidate={handleValidation}
            multiple={multiple}
            onAddAsset={() => setStep(STEPS.AssetUpload)}
            onAddFolder={() => setStep(STEPS.FolderCreate)}
            onChangeFolder={(folder) => setFolderId(folder)}
            trackedLocation="content-manager"
          />
        )}

        {step === STEPS.AssetUpload && (
          <UploadAssetDialog
            open={step === STEPS.AssetUpload}
            onClose={() => setStep(STEPS.AssetSelect)}
            initialAssetsToAdd={droppedAssets as Asset[]}
            addUploadedFiles={handleFilesUploadSucceeded}
            trackedLocation="content-manager"
            folderId={folderId}
            validateAssetsTypes={validateAssetsTypes}
          />
        )}

        {step === STEPS.FolderCreate && (
          <EditFolderDialog
            open={step === STEPS.FolderCreate}
            onClose={() => setStep(STEPS.AssetSelect)}
            parentFolderId={folderId}
          />
        )}
      </>
    );
  }
);
