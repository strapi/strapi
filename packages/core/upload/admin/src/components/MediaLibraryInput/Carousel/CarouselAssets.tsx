import * as React from 'react';

import { CarouselInput, CarouselSlide } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTrad } from '../../../utils/getTrad';
import { EditAssetDialog } from '../../EditAssetDialog/EditAssetContent';

import { CarouselAsset } from './CarouselAsset';
import { CarouselAssetActions } from './CarouselAssetActions';
import { EmptyStateAsset } from './EmptyStateAsset';

import type { File as FileAsset, RawFile } from '../../../../../shared/contracts/files';

export type FileWithoutIdHash = Omit<FileAsset, 'id' | 'hash'>;

interface Asset extends Omit<FileAsset, 'folder'> {
  isLocal?: boolean;
  rawFile?: RawFile;
  folder?: FileAsset['folder'] & { id: number };
}

export interface CarouselAssetsProps {
  assets: FileAsset[];
  disabled?: boolean;
  error?: string;
  hint?: string;
  label: string;
  labelAction?: React.ReactNode;
  onAddAsset: (asset?: FileAsset, event?: React.MouseEventHandler<HTMLButtonElement>) => void;
  onDeleteAsset: (asset: FileAsset) => void;
  onDeleteAssetFromMediaLibrary: () => void;
  onDropAsset?: (assets: FileWithoutIdHash[]) => void;
  onEditAsset?: (asset: FileAsset) => void;
  onNext: () => void;
  onPrevious: () => void;
  required?: boolean;
  selectedAssetIndex: number;
  trackedLocation?: string;
}

export const CarouselAssets = React.forwardRef(
  (
    {
      assets,
      disabled = false,
      error,
      hint,
      label,
      labelAction,
      onAddAsset,
      onDeleteAsset,
      onDeleteAssetFromMediaLibrary,
      onDropAsset,
      onEditAsset,
      onNext,
      onPrevious,
      required = false,
      selectedAssetIndex,
      trackedLocation,
    }: CarouselAssetsProps,
    forwardedRef
  ) => {
    const { formatMessage } = useIntl();
    const [isEditingAsset, setIsEditingAsset] = React.useState(false);

    const currentAsset = assets[selectedAssetIndex];

    return (
      <>
        <CarouselInput
          ref={forwardedRef as React.Ref<HTMLDivElement>}
          label={label}
          labelAction={labelAction}
          secondaryLabel={currentAsset?.name}
          selectedSlide={selectedAssetIndex}
          previousLabel={formatMessage({
            id: getTrad('mediaLibraryInput.actions.previousSlide'),
            defaultMessage: 'Previous slide',
          })}
          nextLabel={formatMessage({
            id: getTrad('mediaLibraryInput.actions.nextSlide'),
            defaultMessage: 'Next slide',
          })}
          onNext={onNext}
          onPrevious={onPrevious}
          hint={hint}
          error={error}
          required={required}
          actions={
            currentAsset ? (
              <CarouselAssetActions
                asset={currentAsset}
                onDeleteAsset={disabled ? undefined : onDeleteAsset}
                onAddAsset={disabled ? undefined : onAddAsset}
                onEditAsset={onEditAsset ? () => setIsEditingAsset(true) : undefined}
              />
            ) : undefined
          }
        >
          {assets.length === 0 ? (
            <CarouselSlide
              label={formatMessage(
                {
                  id: getTrad('mediaLibraryInput.slideCount'),
                  defaultMessage: '{n} of {m} slides',
                },
                { n: 1, m: 1 }
              )}
            >
              <EmptyStateAsset
                disabled={disabled}
                onClick={onAddAsset}
                onDropAsset={onDropAsset!}
              />
            </CarouselSlide>
          ) : (
            assets.map((asset, index) => (
              <CarouselSlide
                key={asset.id}
                label={formatMessage(
                  {
                    id: getTrad('mediaLibraryInput.slideCount'),
                    defaultMessage: '{n} of {m} slides',
                  },
                  { n: index + 1, m: assets.length }
                )}
              >
                <CarouselAsset asset={asset} />
              </CarouselSlide>
            ))
          )}
        </CarouselInput>
        <EditAssetDialog
          open={isEditingAsset}
          onClose={(editedAsset) => {
            setIsEditingAsset(false);

            // The asset has been deleted
            if (editedAsset === null) {
              onDeleteAssetFromMediaLibrary();
            }
            if (editedAsset && typeof editedAsset !== 'boolean') {
              onEditAsset?.(editedAsset);
            }
          }}
          asset={currentAsset as Asset}
          canUpdate
          canCopyLink
          canDownload
          trackedLocation={trackedLocation}
        />
      </>
    );
  }
);
