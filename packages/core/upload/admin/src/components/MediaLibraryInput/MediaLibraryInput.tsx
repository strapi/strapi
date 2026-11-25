import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';

import { useClipboard, useField, useForm, useNotification } from '@strapi/admin/strapi-admin';
import { Field, Flex, VisuallyHidden } from '@strapi/design-system';
import get from 'lodash/get';
import { useIntl } from 'react-intl';

import { useAIMetadataEnabled } from '../../hooks/useAIMetadataEnabled';
import { useMediaLibraryPermissions } from '../../hooks/useMediaLibraryPermissions';
import { useTracking } from '../../hooks/useTracking';
import { AssetDetailsDrawer } from '../../pages/Assets/components/AssetDetails/AssetDetailsDrawer';
import { ImportFromUrlDialog } from '../../pages/Assets/components/ImportFromUrlDialog';
import { useUploadFilesMutation, useUploadFromUrlsMutation } from '../../services/api';
import { useGetUploadSettingsQuery } from '../../services/settings';
import {
  filterAllowedFiles,
  isMediaTypeAllowed,
  type AllowedMediaType,
} from '../../utils/allowedMediaTypes';
import { prefixFileUrlWithBackendUrl } from '../../utils/files';
import { getTranslationKey } from '../../utils/translations';
import { typeFromMime } from '../../utils/typeFromMime';
import { AssetPickerDialog } from '../AssetPickerDialog/AssetPickerDialog';

import { AddAssetMenu } from './AddAssetMenu';
import { AssetCard, UploadCard } from './AssetCard';
import { AssetCarousel } from './AssetCarousel';
import { AssetDropZone, type ZoneVariant } from './AssetDropZone';
import { AssetRow, UploadRow } from './AssetRow';
import { isAnyAssetDetailsOpen, useOpenAssetDetails } from './openAssetDetails';
import { useFieldUploads, type FieldUpload } from './useFieldUploads';

import type { AssetWithPopulatedCreatedBy, File } from '../../../../shared/contracts/files';

/**
 * What a field wrote that its form has not rendered yet, per form and field.
 * `getValues()` only catches up on render, and two uploads can complete before
 * the next one. Kept outside the input so it survives a remount.
 */
const unrenderedWrites = new WeakMap<object, Map<string, { seen: unknown; written: File[] }>>();

const toAssets = (value: unknown): File[] =>
  Array.isArray(value) ? value : value ? [value as File] : [];

/**
 * `location` for every event this field fires. The standalone Media Library
 * tags its events `'upload'`; the picker inside an entry form has always been
 * `'content-manager'`, and analytics still splits the two on that axis.
 */
const CONTENT_MANAGER_LOCATION = 'content-manager';

/**
 * Uploads from here land at the root of the Media Library. An entry form has no
 * current folder to inherit, and the field offers no destination picker — same
 * place the legacy upload wizard put them when none was chosen.
 */
const UPLOAD_FOLDER_ID = null;

type Step = 'browse';

export interface MediaLibraryInputProps {
  name: string;
  label?: string;
  labelAction?: ReactNode;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  attribute?: {
    allowedTypes?: AllowedMediaType[] | null;
    multiple?: boolean;
  };
  /** The field's width in the edit layout, out of 12. Set by the Content Manager. */
  layoutSize?: number;
}

const EMPTY_ATTRIBUTE: NonNullable<MediaLibraryInputProps['attribute']> = {};

export const MediaLibraryInput = ({
  name,
  label,
  labelAction,
  hint,
  required = false,
  disabled = false,
  attribute = EMPTY_ATTRIBUTE,
  layoutSize,
}: MediaLibraryInputProps) => {
  const { allowedTypes = null, multiple = false } = attribute;
  const { formatMessage } = useIntl();
  const { onChange, value, error } = useField<File | File[] | null>(name);
  const { toggleNotification } = useNotification();
  const { trackUsage } = useTracking();
  const { copy } = useClipboard();
  const getValues = useForm('MediaLibraryInput', (state) => state.getValues);

  const [step, setStep] = useState<Step | undefined>(undefined);
  const [editedAssetId, setEditedAssetId] = useState<number | null>(null);
  const isAnyDrawerOpen = useOpenAssetDetails(editedAssetId !== null);
  const [isUrlDialogOpen, setIsUrlDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadFiles] = useUploadFilesMutation();
  const [uploadFromUrls] = useUploadFromUrlsMutation();

  const { isLoading, canRead, canCreate } = useMediaLibraryPermissions();

  const canUpload = !isLoading && canCreate;

  const { data: settings } = useGetUploadSettingsQuery(undefined, { skip: !canRead });
  const concurrency = settings?.data?.concurrentUploadRequests ?? 1;
  const isAiMetadataEnabled = useAIMetadataEnabled();

  const assets: File[] = Array.isArray(value) ? value : value ? [value] : [];

  const assetsRef = useRef(assets);
  assetsRef.current = assets;

  const setAssets = (nextAssets: File[]) => {
    if (multiple) {
      onChange(name, nextAssets.length > 0 ? nextAssets : null);
      return;
    }

    onChange(name, nextAssets[0] ?? null);
  };

  const handleRemove = (asset: File) => {
    setAssets(assets.filter((current) => current.id !== asset.id));
  };

  /**
   * Attach an uploaded file to the form while preserving writes that have not
   * yet been rendered by React.
   */
  const attachUploadedFile = (file: File) => {
    const writes = unrenderedWrites.get(getValues) ?? new Map();
    unrenderedWrites.set(getValues, writes);

    const value = get(getValues(), name);
    const pending = writes.get(name);

    const current = pending && pending.seen === value ? pending.written : toAssets(value);

    const next = multiple ? [...current, file] : [file];

    writes.set(name, { seen: value, written: next });

    setAssets(next);
  };

  const { uploads, cancel, retry, dismiss } = useFieldUploads(name);

  const handleCopyLink = async (asset: File) => {
    const url = prefixFileUrlWithBackendUrl(asset.url);

    if (!url) {
      return;
    }

    const didCopy = await copy(url);

    toggleNotification({
      type: didCopy ? 'success' : 'danger',
      message: formatMessage(
        didCopy
          ? {
              id: getTranslationKey('asset-details.copy-link.success'),
              defaultMessage: 'Link copied.',
            }
          : {
              id: getTranslationKey('asset-details.copy-link.error'),
              defaultMessage: 'Failed to copy the link.',
            }
      ),
    });
  };

  const handleEdit = (asset: File) => {
    if (!isAnyAssetDetailsOpen()) {
      setEditedAssetId(asset.id);
    }
  };

  const handleAssetChange = (changedAsset: AssetWithPopulatedCreatedBy) => {
    setAssets(
      assetsRef.current.map((current) =>
        current.id === changedAsset.id ? (changedAsset as unknown as File) : current
      )
    );
  };

  const handleAssetDelete = (id: number) => {
    setAssets(assetsRef.current.filter((current) => current.id !== id));
  };

  const handleSelect = (selectedAssets: File[]) => {
    setAssets(selectedAssets);
    setStep(undefined);
  };

  const notifyUnsupported = () => {
    toggleNotification({
      type: 'danger',
      timeout: 4000,
      message: formatMessage(
        {
          id: getTranslationKey('input.notification.not-supported'),
          defaultMessage: `You can't upload this type of file, only the following types are accepted – {fileTypes}`,
        },
        { fileTypes: (allowedTypes ?? []).join(',') }
      ),
    });
  };

  const rejectsBatch = (count: number) => {
    if (multiple || count <= 1) {
      return false;
    }

    toggleNotification({
      type: 'danger',
      timeout: 4000,
      message: formatMessage({
        id: getTranslationKey('content-manager.input.notification.single-file'),
        defaultMessage: 'This field accepts only one file.',
      }),
    });

    return true;
  };

  const handleUpload = (files: globalThis.File[]) => {
    if (disabled || !canUpload || files.length === 0) {
      return;
    }

    if (rejectsBatch(files.length)) {
      return;
    }

    const allowedFiles = filterAllowedFiles(allowedTypes, files);

    if (allowedFiles.length === 0) {
      notifyUnsupported();
      return;
    }

    if (allowedFiles.length < files.length) {
      notifyUnsupported();
    }

    const assetsCountByType = allowedFiles.reduce<Record<string, number>>((acc, file) => {
      const type = typeFromMime(file.type);
      acc[type] = (acc[type] ?? 0) + 1;
      return acc;
    }, {});

    trackUsage('didSelectFile', { source: 'computer', location: CONTENT_MANAGER_LOCATION });

    trackUsage('willAddMediaLibraryAssets', {
      location: CONTENT_MANAGER_LOCATION,
      ...assetsCountByType,
    });

    startUpload(allowedFiles);
  };

  const startUpload = (allowedFiles: globalThis.File[]) => {
    const formData = new FormData();

    allowedFiles.forEach((file) => formData.append('files', file));

    formData.append(
      'fileInfo',
      JSON.stringify(
        allowedFiles.map((file) => ({
          name: file.name,
          caption: null,
          alternativeText: null,
          folder: UPLOAD_FOLDER_ID,
        }))
      )
    );

    uploadFiles({
      formData,
      totalFiles: allowedFiles.length,
      concurrency,
      generateAiMetadata: Boolean(isAiMetadataEnabled),
      onFileUploaded: attachUploadedFile,
      owner: name,
    });
  };

  const handleRetry = (upload: FieldUpload) => retry(upload, (file) => startUpload([file]));

  /**
   * Upload files from URLs and attach them using the same form-state mechanism
   * as device uploads.
   */
  const handleUrlUpload = async (urls: string[]) => {
    if (disabled || !canUpload || urls.length === 0 || rejectsBatch(urls.length)) {
      return;
    }

    trackUsage('didSelectFile', { source: 'url', location: CONTENT_MANAGER_LOCATION });

    trackUsage('willAddMediaLibraryAssets', {
      location: CONTENT_MANAGER_LOCATION,
    });

    try {
      const { data: uploadedFiles } = await uploadFromUrls({
        urls,
        folderId: UPLOAD_FOLDER_ID,
        generateAiMetadata: Boolean(isAiMetadataEnabled),
      }).unwrap();

      const allowedFiles = uploadedFiles.filter((file) =>
        isMediaTypeAllowed(allowedTypes, file.mime)
      );

      // FIX: Correctly identify files that were uploaded but cannot be attached.
      const notAttachedFiles = uploadedFiles.filter((file) => !allowedFiles.includes(file));

      if (notAttachedFiles.length > 0) {
        toggleNotification({
          type: 'warning',
          timeout: 4000,
          message: formatMessage(
            {
              id: getTranslationKey('content-manager.input.notification.not-attached'),
              defaultMessage:
                '{fileNames} {count, plural, one {was} other {were}} added to the Media Library, but this field only accepts {fileTypes}.',
            },
            {
              fileNames: notAttachedFiles.map((file) => file.name).join(', '),
              count: notAttachedFiles.length,
              fileTypes: (allowedTypes ?? []).join(', '),
            }
          ),
        });
      }

      // Attach through the shared mechanism to avoid stale form-state updates.
      for (const file of allowedFiles) {
        attachUploadedFile(file);
      }
    } catch {
      // Errors reach the user through the progress dialog, which the mutation
      // populates itself.
    }
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

    event.target.value = '';

    if (files.length > 0) {
      handleUpload(files);
    }
  };

  const renderValue = () => {
    const dropZone = (variant: ZoneVariant) => (
      <AssetDropZone
        variant={variant}
        disabled={disabled || !canUpload}
        onDropFiles={handleUpload}
      />
    );

    if (assets.length === 0 && uploads.length === 0) {
      return dropZone('bar');
    }

    const uploadHandlers = {
      disabled,
      onCancel: cancel,
      onRetry: handleRetry,
      onRemove: (upload: FieldUpload) => dismiss(upload.key),
    };

    if (!multiple) {
      if (uploads.length > 0) {
        return (
          <Flex direction="column" alignItems="stretch" gap={2}>
            {uploads.map((upload) => (
              <UploadRow key={upload.key} upload={upload} {...uploadHandlers} />
            ))}
          </Flex>
        );
      }

      return (
        <AssetRow
          asset={assets[0]}
          disabled={disabled}
          onCopyLink={handleCopyLink}
          onEdit={canRead ? handleEdit : undefined}
          onRemove={handleRemove}
        />
      );
    }

    return (
      <AssetCarousel renderDropZone={dropZone} layoutSize={layoutSize}>
        {assets.map((asset) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            disabled={disabled}
            onCopyLink={handleCopyLink}
            onEdit={canRead ? handleEdit : undefined}
            onRemove={handleRemove}
          />
        ))}
        {uploads.map((upload) => (
          <UploadCard key={upload.key} upload={upload} {...uploadHandlers} />
        ))}
      </AssetCarousel>
    );
  };

  return (
    <Field.Root name={name} error={error} hint={hint} required={required}>
      <Flex justifyContent="space-between" alignItems="center" gap={2}>
        <Field.Label action={labelAction}>{label}</Field.Label>

        <AddAssetMenu
          disabled={disabled}
          preventOpen={isAnyDrawerOpen}
          onBrowseLibrary={() => setStep('browse')}
          onUploadFromDevice={() => fileInputRef.current?.click()}
          onUploadFromUrl={() => setIsUrlDialogOpen(true)}
        />
      </Flex>

      {renderValue()}

      <Field.Error />
      <Field.Hint />

      <VisuallyHidden>
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          onChange={handleFileInputChange}
          tabIndex={-1}
          aria-hidden
        />
      </VisuallyHidden>

      {step === 'browse' && (
        <AssetPickerDialog
          open
          title={formatMessage(
            {
              id: getTranslationKey('asset-picker.title'),
              defaultMessage: 'Add asset for {fieldName}',
            },
            { fieldName: label ?? name }
          )}
          initialSelection={assets}
          multiple={multiple}
          allowedTypes={allowedTypes}
          onClose={() => setStep(undefined)}
          onConfirm={handleSelect}
        />
      )}

      <AssetDetailsDrawer
        assetId={editedAssetId}
        onClose={() => setEditedAssetId(null)}
        onAssetChange={handleAssetChange}
        onAssetDelete={handleAssetDelete}
        trackedLocation={CONTENT_MANAGER_LOCATION}
      />

      <ImportFromUrlDialog
        open={isUrlDialogOpen}
        onClose={() => setIsUrlDialogOpen(false)}
        onUpload={handleUrlUpload}
      />
    </Field.Root>
  );
};
