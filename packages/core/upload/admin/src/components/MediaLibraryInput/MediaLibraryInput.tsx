import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';

import { useField, useNotification } from '@strapi/admin/strapi-admin';
import { Field, Flex, VisuallyHidden } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useAIMetadataEnabled } from '../../hooks/useAIMetadataEnabled';
import { useMediaLibraryPermissions } from '../../hooks/useMediaLibraryPermissions';
import { useTracking } from '../../hooks/useTracking';
// Temporary: the Content Manager's own asset picker is not built on this stack
// yet, so browsing the library still goes through the legacy dialog. Both
// imports go when that modal lands.
import { AssetDialog } from '../../legacy/components/AssetDialog/AssetDialog';
import { EditFolderDialog } from '../../legacy/components/EditFolderDialog/EditFolderDialog';
import { ImportFromUrlDialog } from '../../pages/Assets/components/ImportFromUrlDialog';
import { useUploadFilesMutation, useUploadFromUrlsMutation } from '../../services/api';
import { useGetUploadSettingsQuery } from '../../services/settings';
import {
  filterAllowedFiles,
  isMediaTypeAllowed,
  type AllowedMediaType,
} from '../../utils/allowedMediaTypes';
import { getTranslationKey } from '../../utils/translations';
import { typeFromMime } from '../../utils/typeFromMime';

import { AddAssetMenu } from './AddAssetMenu';
import { AssetDropZone } from './AssetDropZone';
import { AssetRow } from './AssetRow';

import type { File } from '../../../../shared/contracts/files';

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

type Step = 'browse' | 'create-folder';

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
}

/**
 * The Content Manager's `media` field, on the current Media Library stack.
 *
 * Files dropped here (or picked from the device) upload straight through
 * `uploadFiles`, which is what drives the global upload progress dialog — so the
 * entry form stays usable while they go, instead of being covered by the legacy
 * wizard.
 *
 * The legacy input is still registered when `useLegacyMediaLibrary` is on, and
 * is untouched by this.
 */
export const MediaLibraryInput = ({
  name,
  label,
  labelAction,
  hint,
  required = false,
  disabled = false,
  attribute: { allowedTypes = null, multiple = false } = {},
}: MediaLibraryInputProps) => {
  const { formatMessage } = useIntl();
  const { onChange, value, error } = useField<File | File[] | null>(name);
  const { toggleNotification } = useNotification();
  const { trackUsage } = useTracking();

  const [step, setStep] = useState<Step | undefined>(undefined);
  const [folderId, setFolderId] = useState<number | null>(null);
  const [isUrlDialogOpen, setIsUrlDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadFiles] = useUploadFilesMutation();
  const [uploadFromUrls] = useUploadFromUrlsMutation();
  // Echoes the app config; a missing payload (still loading) falls back to
  // sequential rather than outpacing what the server asked for.
  const { canRead } = useMediaLibraryPermissions();
  const { data: settings } = useGetUploadSettingsQuery(undefined, { skip: !canRead });
  const concurrency = settings?.data?.concurrentUploadRequests ?? 1;
  const isAiMetadataEnabled = useAIMetadataEnabled();

  const assets: File[] = Array.isArray(value) ? value : value ? [value] : [];

  // An upload resumes long after the render that started it, and the dialog is
  // non-blocking precisely so a second batch can be dropped meanwhile. Reading
  // the closed-over `assets` on resume would then append to whatever the field
  // held when that drop began, dropping every asset that landed since.
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

  const handleSelect = (selectedAssets: File[]) => {
    setAssets(selectedAssets);
    setStep(undefined);
    setFolderId(null);
  };

  const notifyUnsupported = () => {
    toggleNotification({
      type: 'danger',
      timeout: 4000,
      message: formatMessage(
        {
          // Legacy key: translated everywhere, and it names the accepted types,
          // which the field already passes as `fileTypes`.
          id: getTranslationKey('input.notification.not-supported'),
          defaultMessage: `You can't upload this type of file, only the following types are accepted – {fileTypes}`,
        },
        { fileTypes: (allowedTypes ?? []).join(',') }
      ),
    });
  };

  /**
   * True when the batch is more than a single-value field can take. Counted on
   * what was handed in rather than on what survives filtering: uploading one of
   * several would leave the user guessing which one the field kept.
   */
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

  const handleUpload = async (files: globalThis.File[]) => {
    if (disabled || files.length === 0) {
      return;
    }

    // The device picker can't reach this — it carries `multiple` — so a drop is
    // the only way in.
    if (rejectsBatch(files.length)) {
      return;
    }

    const allowedFiles = filterAllowedFiles(allowedTypes, files);

    if (allowedFiles.length === 0) {
      notifyUnsupported();
      return;
    }

    // A mixed drop uploads what it can and says so, rather than silently
    // dropping the rest.
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

    try {
      const uploadedFiles = await uploadFiles({
        formData,
        totalFiles: allowedFiles.length,
        concurrency,
        generateAiMetadata: Boolean(isAiMetadataEnabled),
      }).unwrap();

      // A cancelled or wholly failed batch resolves with nothing to add; the
      // progress dialog has already reported why.
      if (uploadedFiles.length > 0) {
        setAssets(multiple ? [...assetsRef.current, ...uploadedFiles] : [uploadedFiles[0]]);
      }
    } catch {
      // Errors reach the user through the progress dialog, which the mutation
      // populates itself.
    }
  };

  /**
   * The server fetches each URL and uploads what it finds, so the file's type
   * is not known here — `allowedTypes` can only be enforced on what comes back.
   * A URL whose file the field does not accept is uploaded to the library and
   * left off the field, which is also what the Media Library page does with it.
   */
  const handleUrlUpload = async (urls: string[]) => {
    if (disabled || urls.length === 0 || rejectsBatch(urls.length)) {
      return;
    }

    trackUsage('didSelectFile', { source: 'url', location: CONTENT_MANAGER_LOCATION });
    trackUsage('willAddMediaLibraryAssets', { location: CONTENT_MANAGER_LOCATION });

    try {
      const { data: uploadedFiles } = await uploadFromUrls({
        urls,
        folderId: UPLOAD_FOLDER_ID,
        generateAiMetadata: Boolean(isAiMetadataEnabled),
      }).unwrap();

      const allowedFiles = uploadedFiles.filter((file) =>
        isMediaTypeAllowed(allowedTypes, file.mime)
      );

      if (allowedFiles.length < uploadedFiles.length) {
        notifyUnsupported();
      }

      if (allowedFiles.length > 0) {
        setAssets(multiple ? [...assetsRef.current, ...allowedFiles] : [allowedFiles[0]]);
      }
    } catch {
      // Errors reach the user through the progress dialog, which the mutation
      // populates itself.
    }
  };

  const handleFileInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    // Copied before the reset, not after: `event.target.files` is the input's
    // live FileList, and clearing `value` empties it in place. Reading it
    // afterwards yields nothing and the upload never starts.
    const files = Array.from(event.target.files ?? []);
    // Reset so picking the same file twice in a row still fires `change`.
    event.target.value = '';

    if (files.length > 0) {
      await handleUpload(files);
    }
  };

  return (
    <Field.Root name={name} error={error} hint={hint} required={required}>
      <Flex justifyContent="space-between" alignItems="center" gap={2}>
        <Field.Label action={labelAction}>{label}</Field.Label>
        <AddAssetMenu
          disabled={disabled}
          onBrowseLibrary={() => setStep('browse')}
          onUploadFromDevice={() => fileInputRef.current?.click()}
          onUploadFromUrl={() => setIsUrlDialogOpen(true)}
        />
      </Flex>

      <Flex direction="column" alignItems="stretch" gap={1}>
        {assets.map((asset) => (
          <AssetRow key={asset.id} asset={asset} disabled={disabled} onRemove={handleRemove} />
        ))}

        <AssetDropZone
          disabled={disabled}
          onClick={() => setStep('browse')}
          onDropFiles={handleUpload}
        />
      </Flex>

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
        <AssetDialog
          open
          multiple={multiple}
          allowedTypes={allowedTypes ?? []}
          initiallySelectedAssets={assets}
          folderId={folderId}
          trackedLocation={CONTENT_MANAGER_LOCATION}
          onClose={() => {
            setStep(undefined);
            setFolderId(null);
          }}
          onValidate={handleSelect}
          onAddFolder={() => setStep('create-folder')}
          // The dialog's own upload button hands back to this field's upload
          // path, so every route to an uploaded file opens the progress dialog.
          onAddAsset={() => {
            setStep(undefined);
            fileInputRef.current?.click();
          }}
          onChangeFolder={(nextFolderId) => setFolderId(nextFolderId)}
        />
      )}

      {step === 'create-folder' && (
        <EditFolderDialog open onClose={() => setStep('browse')} parentFolderId={folderId} />
      )}

      <ImportFromUrlDialog
        open={isUrlDialogOpen}
        onClose={() => setIsUrlDialogOpen(false)}
        onUpload={handleUrlUpload}
      />
    </Field.Root>
  );
};
