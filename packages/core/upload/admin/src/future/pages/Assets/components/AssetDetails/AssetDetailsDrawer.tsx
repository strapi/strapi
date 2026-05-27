import * as React from 'react';

import {
  Blocker,
  Form,
  useClipboard,
  useField,
  useForm,
  useNotification,
  useQueryParams,
  getDisplayName,
} from '@strapi/admin/strapi-admin';
import {
  Alert,
  Box,
  Button,
  Dialog,
  Field,
  Flex,
  IconButton,
  Loader,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Tooltip,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import {
  ArrowLineRight,
  ArrowsCounterClockwise,
  Crop,
  Download,
  FileError,
  Link,
  Trash,
  WarningCircle,
} from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { ASSET_TYPES } from '../../../../../enums';
import { Drawer } from '../../../../components/Drawer';
import { useUploadFilesMutation } from '../../../../services/api';
import {
  useDeleteAssetMutation,
  useGetAssetQuery,
  useReplaceAssetMutation,
  useUpdateAssetMutation,
} from '../../../../services/assets';
import { useGetAllFoldersQuery } from '../../../../services/folders';
import { useGetSettingsQuery } from '../../../../services/settings';
import { downloadFile } from '../../../../utils/downloadFile';
import {
  formatBytes,
  getFileExtension,
  prefixFileUrlWithBackendUrl,
} from '../../../../utils/files';
import { getAssetIcon } from '../../../../utils/getAssetIcon';
import { getTranslationKey } from '../../../../utils/translations';
import { useFolderInfo } from '../../hooks/useFolderInfo';

import { AssetCropEditor } from './AssetCropEditor';
import { AssetPreview } from './AssetPreview';

import type {
  AssetWithPopulatedCreatedBy,
  FocalPoint,
} from '../../../../../../../shared/contracts/files';

// Name of the parameter to look for in the URL to open the drawer
const URL_PARAM = 'assetId';

interface DrawerToast {
  type: 'success' | 'danger';
  message: string;
}

/* -------------------------------------------------------------------------------------------------
 * DrawerNotifyContext — exposes the in-drawer toast setter so deep descendants
 * (footer action buttons) can report success/error without prop drilling.
 * -----------------------------------------------------------------------------------------------*/

type DrawerNotify = (toast: DrawerToast) => void;

export const DrawerNotifyContext = React.createContext<DrawerNotify | null>(null);

const useDrawerNotify = () => {
  const ctx = React.useContext(DrawerNotifyContext);
  if (!ctx) {
    throw new Error('useDrawerNotify must be used within AssetDetails');
  }
  return ctx;
};

/* -------------------------------------------------------------------------------------------------
 * AssetOperationsContext — drawer-scoped mutations + their pending state, so
 * leaf buttons (Delete, Replace) consume them without prop drilling and the
 * full-drawer busy overlay reads a single flag.
 * -----------------------------------------------------------------------------------------------*/

interface AssetOperations {
  replaceAsset: (file: globalThis.File) => Promise<void>;
  deleteAsset: () => Promise<void>;
  isReplacing: boolean;
  isDeleting: boolean;
}

export const AssetOperationsContext = React.createContext<AssetOperations | null>(null);

const useAssetOperation = () => {
  const ctx = React.useContext(AssetOperationsContext);
  if (!ctx) {
    throw new Error('useAssetOperation must be used within AssetDetails');
  }
  return ctx;
};

/* -------------------------------------------------------------------------------------------------
 * useAssetDetailsParam - sync drawer visibility with URL ?{URL_PARAM}={id}
 * -----------------------------------------------------------------------------------------------*/

export const useAssetDetailsParam = () => {
  const [{ query }, setQuery] = useQueryParams<{ [URL_PARAM]?: string }>();

  const detailsId = query?.[URL_PARAM];
  const assetId = detailsId ? parseInt(detailsId, 10) : null;
  const hasValidId = assetId !== null && !Number.isNaN(assetId);

  // Closing is driven by removing the URL param (a navigation), so navigation
  // guards like <Blocker> can intercept it. `isMounted` keeps the drawer in the
  // tree through the slide-out: it stays true once opened and only flips false
  // when the close animation actually ends (see onCloseAnimationEnd), so the
  // close duration lives entirely in CSS — no JS timer.
  const [isMounted, setIsMounted] = React.useState(hasValidId);
  const displayAssetId = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (hasValidId) {
      displayAssetId.current = assetId;
      setIsMounted(true);
    }
  }, [hasValidId, assetId]);

  const onCloseAnimationEnd = React.useCallback(
    (event: React.AnimationEvent) => {
      // Ignore animations bubbling up from descendants, and the slide-in.
      if (event.target === event.currentTarget && !hasValidId) {
        setIsMounted(false);
      }
    },
    [hasValidId]
  );

  const openDetails = React.useCallback(
    (id: number) => {
      setQuery({ [URL_PARAM]: String(id) }, 'push', true);
    },
    [setQuery]
  );

  const closeDetails = React.useCallback(() => {
    setQuery({ [URL_PARAM]: undefined }, 'remove', true);
  }, [setQuery]);

  return {
    assetId: hasValidId ? assetId : displayAssetId.current,
    isVisible: hasValidId,
    shouldRenderDrawer: isMounted,
    onCloseAnimationEnd,
    openDetails,
    closeDetails,
  };
};

/* -------------------------------------------------------------------------------------------------
 * DetailItem
 * -----------------------------------------------------------------------------------------------*/

interface DetailItemProps {
  label: string;
  value: React.ReactNode;
}

const DetailItemContainer = styled(Flex)`
  flex: 0 0 calc(50% - ${({ theme }) => theme.spaces[2]});
`;

const DetailItem = ({ label, value }: DetailItemProps) => (
  <DetailItemContainer
    direction="column"
    justifyContent="flex-start"
    alignItems="flex-start"
    gap={1}
  >
    <Typography
      variant="sigma"
      textColor="neutral600"
      fontWeight="semiBold"
      textTransform="uppercase"
    >
      {label}
    </Typography>
    <Typography variant="pi" textColor="neutral700">
      {value ?? '-'}
    </Typography>
  </DetailItemContainer>
);

/* -------------------------------------------------------------------------------------------------
 * DetailField
 * -----------------------------------------------------------------------------------------------*/

/**
 * Make the asset details Form behave as a flex column inside Drawer.Body so
 * the scrollable area can grow while the footer stays pinned at the bottom.
 * The Form component from `@strapi/admin/strapi-admin` only forwards `width`
 * + `height` to its Box, so we target the rendered `<form>` element via a
 * styled-components descendant rule.
 */
const FormShell = styled(Box)`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;

  > form {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    position: relative;
  }
`;

/**
 * In-drawer toast container
 */
const DrawerToastSlot = styled(Box)`
  position: absolute;
  top: ${({ theme }) => theme.spaces[2]};
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  width: calc(100% - ${({ theme }) => theme.spaces[2]});
`;

/**
 * Full-form overlay rendered during long-running drawer-scoped mutations
 * (e.g. replacing the binary). Sits above the toast slot (z-index 10) and
 * the in-drawer Alert so the user can't interact with the form mid-flight.
 */
const DrawerBusyOverlay = styled(Flex)`
  position: absolute;
  inset: 0;
  z-index: 20;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.neutral0};
  opacity: 0.7;
`;

/**
 * Map the drawer-scoped mutation flags to a single i18n message for the busy
 * overlay loader. Returns `null` when nothing is in flight.
 */
const getBusyMessage = (state: {
  isDeleting: boolean;
  isReplacing: boolean;
  isCropCopying: boolean;
}): { id: string; defaultMessage: string } | null => {
  if (state.isDeleting) {
    return {
      id: getTranslationKey('asset-details.delete.loading'),
      defaultMessage: 'Deleting the file…',
    };
  }
  if (state.isCropCopying) {
    return {
      id: getTranslationKey('asset-details.crop.loading'),
      defaultMessage: 'Saving the cropped copy…',
    };
  }
  if (state.isReplacing) {
    return {
      id: getTranslationKey('asset-details.replace.loading'),
      defaultMessage: 'Replacing the file…',
    };
  }
  return null;
};

const StyledWarning = styled(WarningCircle)`
  width: 1.6rem;
  height: 1.6rem;

  path {
    fill: ${({ theme }) => theme.colors.warning500};
  }
`;

interface DetailFieldProps {
  name: string;
  label: string;
  required?: boolean;
}

const DetailField = ({ name, label, required }: DetailFieldProps) => {
  const { formatMessage } = useIntl();
  const field = useField<string>(name);
  const isSubmitting = useForm('DetailField', (state) => state.isSubmitting);
  const value = field.value ?? '';
  const emptyTooltipLabel = formatMessage(
    {
      id: getTranslationKey('asset-details.field.empty'),
      defaultMessage: '{label} is currently empty.',
    },
    { label }
  );

  return (
    <Field.Root name={name} required={required}>
      <Field.Label>{label}</Field.Label>
      <TextInput
        value={value}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
          field.onChange(name, event.target.value)
        }
        endAction={
          !value ? (
            <Tooltip label={emptyTooltipLabel}>
              <StyledWarning aria-label={emptyTooltipLabel} role="img" />
            </Tooltip>
          ) : undefined
        }
        type="text"
        disabled={isSubmitting}
      />
    </Field.Root>
  );
};

/* -------------------------------------------------------------------------------------------------
 * LocationField
 * -----------------------------------------------------------------------------------------------*/

interface LocationFieldProps {
  label: string;
  rootLabel: string;
  folders: Array<{ id: number; name: string }>;
}

const LocationField = ({ label, rootLabel, folders }: LocationFieldProps) => {
  const field = useField<number | null>('folder');
  const isSubmitting = useForm('LocationField', (state) => state.isSubmitting);

  return (
    <Field.Root name="folder" required>
      <Field.Label>{label}</Field.Label>
      {/* `null` is the canonical "root of the Media Library" value everywhere
          in the upload domain. The DS `SingleSelectOption.value` prop is typed
          `string | number`, so we use the empty string as a DOM-only sentinel
          for the root option and map it back to `null` on change. */}
      <SingleSelect
        value={field.value == null ? '' : String(field.value)}
        onChange={(value) => {
          const next = value === '' ? null : Number(value);
          field.onChange('folder', next);
        }}
        disabled={isSubmitting}
      >
        <SingleSelectOption value="">{rootLabel}</SingleSelectOption>
        {folders.map((folder) => (
          <SingleSelectOption key={folder.id} value={String(folder.id)}>
            {folder.name}
          </SingleSelectOption>
        ))}
      </SingleSelect>
    </Field.Root>
  );
};

/* -------------------------------------------------------------------------------------------------
 * DeleteAssetButton
 * -----------------------------------------------------------------------------------------------*/

const DeleteAssetButton = () => {
  const { formatMessage } = useIntl();
  const { deleteAsset, isDeleting } = useAssetOperation();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleConfirm = async () => {
    await deleteAsset();
    setIsOpen(false);
  };

  const triggerLabel = formatMessage({
    id: getTranslationKey('asset-details.delete.trigger'),
    defaultMessage: 'Delete this file',
  });

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger>
        <IconButton withTooltip={false} label={triggerLabel} variant="danger-light">
          <Trash />
        </IconButton>
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          {formatMessage({
            id: getTranslationKey('asset-details.delete.title'),
            defaultMessage: 'Delete this media file?',
          })}
        </Dialog.Header>
        <Dialog.Body
          icon={<WarningCircle width="24px" height="24px" fill="danger600" />}
          textAlign="center"
        >
          {formatMessage({
            id: getTranslationKey('asset-details.delete.description'),
            defaultMessage:
              'This file cannot be recovered once deleted. If it is currently in use, linked content will break and image containers will be empty.',
          })}
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.Cancel>
            <Button variant="tertiary" disabled={isDeleting} fullWidth>
              {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
            </Button>
          </Dialog.Cancel>
          <Dialog.Action>
            <Button variant="danger-light" loading={isDeleting} onClick={handleConfirm} fullWidth>
              {formatMessage({ id: 'app.components.Button.confirm', defaultMessage: 'Confirm' })}
            </Button>
          </Dialog.Action>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
};

/* -------------------------------------------------------------------------------------------------
 * CopyLinkButton — write the absolute asset URL to the clipboard.
 * -----------------------------------------------------------------------------------------------*/

interface CopyLinkButtonProps {
  asset: AssetWithPopulatedCreatedBy;
}

const CopyLinkButton = ({ asset }: CopyLinkButtonProps) => {
  const { formatMessage } = useIntl();
  const { copy } = useClipboard();
  const notify = useDrawerNotify();

  const handleCopy = async () => {
    const url = prefixFileUrlWithBackendUrl(asset.url);
    if (!url) return;
    const didCopy = await copy(url);
    notify({
      type: didCopy ? 'success' : 'danger',
      message: didCopy
        ? formatMessage({
            id: getTranslationKey('asset-details.copy-link.success'),
            defaultMessage: 'Link copied.',
          })
        : formatMessage({
            id: getTranslationKey('asset-details.copy-link.error'),
            defaultMessage: 'Failed to copy the link.',
          }),
    });
  };

  return (
    <IconButton
      withTooltip={false}
      label={formatMessage({
        id: getTranslationKey('asset-details.copy-link.trigger'),
        defaultMessage: 'Copy link',
      })}
      variant="tertiary"
      onClick={handleCopy}
    >
      <Link />
    </IconButton>
  );
};

/* -------------------------------------------------------------------------------------------------
 * DownloadAssetButton — fetch the file and trigger a browser download.
 * -----------------------------------------------------------------------------------------------*/

interface DownloadAssetButtonProps {
  asset: AssetWithPopulatedCreatedBy;
}

const DownloadAssetButton = ({ asset }: DownloadAssetButtonProps) => {
  const { formatMessage } = useIntl();
  const notify = useDrawerNotify();
  const [isDownloading, setIsDownloading] = React.useState(false);

  const handleDownload = async () => {
    const url = prefixFileUrlWithBackendUrl(asset.url);
    if (!url) return;
    setIsDownloading(true);
    try {
      await downloadFile(url, asset.name);
    } catch {
      notify({
        type: 'danger',
        message: formatMessage({
          id: getTranslationKey('asset-details.download.error'),
          defaultMessage: 'Failed to download the file.',
        }),
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <IconButton
      withTooltip={false}
      label={formatMessage({
        id: getTranslationKey('asset-details.download.trigger'),
        defaultMessage: 'Download',
      })}
      variant="tertiary"
      onClick={handleDownload}
      disabled={isDownloading}
    >
      <Download />
    </IconButton>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ReplaceAssetButton
 * -----------------------------------------------------------------------------------------------*/

const ReplaceAssetButton = () => {
  const { formatMessage } = useIntl();
  const { replaceAsset, isReplacing } = useAssetOperation();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const { data: settings } = useGetSettingsQuery();
  const aiEnabled = settings?.data?.aiMetadata ?? false;

  const handleTriggerClick = () => {
    setIsDialogOpen(true);
  };

  const handleContinue = () => {
    // Confirm first, then open the native picker so the user only commits to
    // replacing after acknowledging the warning. The actual POST is delegated
    // to the parent (which owns the mutation + loading state).
    setIsDialogOpen(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset the native input so the same file can be picked again later.
    event.target.value = '';
    if (!file) {
      return;
    }
    await replaceAsset(file);
  };

  return (
    <>
      <VisuallyHidden>
        <input
          ref={fileInputRef}
          type="file"
          multiple={false}
          onChange={handleFileChange}
          aria-hidden
          tabIndex={-1}
        />
      </VisuallyHidden>
      <IconButton
        withTooltip={false}
        label={formatMessage({
          id: getTranslationKey('asset-details.replace.trigger'),
          defaultMessage: 'Replace this file',
        })}
        variant="tertiary"
        onClick={handleTriggerClick}
        disabled={isReplacing}
      >
        <ArrowsCounterClockwise />
      </IconButton>
      <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Dialog.Content>
          <Dialog.Header>
            {formatMessage({
              id: getTranslationKey('asset-details.replace.title'),
              defaultMessage: 'Replace this media file?',
            })}
          </Dialog.Header>
          <Dialog.Body textAlign="center">
            <Flex direction="column" textAlign="center">
              <Typography variant="omega">
                {formatMessage({
                  id: getTranslationKey('asset-details.replace.description'),
                  defaultMessage: 'Current content will be permanently replaced.',
                })}
              </Typography>
              {aiEnabled ? (
                <Typography variant="omega">
                  {formatMessage({
                    id: getTranslationKey('asset-details.replace.description.ai'),
                    defaultMessage: 'AI will generate new metadata after upload.',
                  })}
                </Typography>
              ) : null}
            </Flex>
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.Cancel>
              <Button variant="tertiary" fullWidth>
                {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
              </Button>
            </Dialog.Cancel>
            <Dialog.Action>
              <Button variant="secondary" onClick={handleContinue} fullWidth>
                {formatMessage({
                  id: getTranslationKey('asset-details.replace.continue'),
                  defaultMessage: 'Continue',
                })}
              </Button>
            </Dialog.Action>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * AssetImageActions - crop and replace buttons overlaid on the image preview.
 * -----------------------------------------------------------------------------------------------*/

interface AssetImageActionsProps {
  onCrop?: () => void;
}

const AssetImageActions = ({ onCrop }: AssetImageActionsProps) => {
  const { formatMessage } = useIntl();
  const isSubmitting = useForm('AssetImageActions', (state) => state.isSubmitting);

  return (
    <Flex direction="column" gap={2}>
      <IconButton
        withTooltip={false}
        label={formatMessage({
          id: getTranslationKey('asset-details.crop.trigger'),
          defaultMessage: 'Crop',
        })}
        variant="tertiary"
        onClick={onCrop}
        disabled={isSubmitting || !onCrop}
      >
        <Crop />
      </IconButton>
      <ReplaceAssetButton />
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * AssetDetails
 * -----------------------------------------------------------------------------------------------*/

interface AssetDetailsProps {
  asset: AssetWithPopulatedCreatedBy;
  closeDetails: () => void;
}

interface AssetFormState {
  name: string;
  caption: string;
  alternativeText: string;
  folder: number | null;
}

export const AssetDetails = ({ asset, closeDetails }: AssetDetailsProps) => {
  const { formatMessage, formatDate } = useIntl();
  const { data: folders = [] } = useGetAllFoldersQuery();
  const { toggleNotification } = useNotification();
  const [updateAsset] = useUpdateAssetMutation();
  const [replaceMutation, { isLoading: isReplacing }] = useReplaceAssetMutation();
  const [deleteMutation, { isLoading: isDeleting }] = useDeleteAssetMutation();
  const [uploadFiles, { isLoading: isCropCopying }] = useUploadFilesMutation();

  const [isCropOpen, setIsCropOpen] = React.useState(false);

  // In-drawer toast slot
  const [drawerToast, setDrawerToast] = React.useState<DrawerToast | null>(null);
  React.useEffect(() => {
    if (!drawerToast) return;
    const timer = window.setTimeout(() => setDrawerToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [drawerToast]);

  // Local alias matching the DrawerNotifyContext signature, so the drawer's
  // own handlers (replace, update) read like the consumers do.
  const notify = React.useCallback<DrawerNotify>((toast) => setDrawerToast(toast), []);

  const isImage = asset.mime?.includes(ASSET_TYPES.Image);

  const initialValues: AssetFormState = {
    name: asset.name ?? '',
    caption: asset.caption ?? '',
    alternativeText: asset.alternativeText ?? '',
    folder:
      typeof asset.folder === 'object' && asset.folder !== null
        ? ((asset.folder as { id: number }).id ?? null)
        : ((asset.folder as number | null | undefined) ?? null),
  };

  const handleSubmit = async (values: AssetFormState) => {
    const fileInfo = {
      name: values.name,
      caption: values.caption,
      alternativeText: values.alternativeText,
      folder: values.folder,
    };

    const res = await updateAsset({ id: asset.id, fileInfo });

    if ('error' in res) {
      notify({
        type: 'danger',
        message: formatMessage({
          id: getTranslationKey('asset-details.update.error'),
          defaultMessage: 'Failed to update the file.',
        }),
      });
      return;
    }

    notify({
      type: 'success',
      message: formatMessage({
        id: getTranslationKey('asset-details.update.success'),
        defaultMessage: 'File updated',
      }),
    });
  };

  const { title: folderName } = useFolderInfo(
    typeof asset.folder === 'object' && asset.folder !== null
      ? ((asset.folder as { id: number }).id ?? null)
      : ((asset.folder as number | null | undefined) ?? null)
  );

  // Owns the replace upload so isReplacing can drive the busy overlay.
  const handleReplace = async (file: globalThis.File) => {
    const res = await replaceMutation({ id: asset.id, file });
    if ('error' in res) {
      const error = res.error as { data?: { error?: { message?: string }; message?: string } };
      const message =
        error?.data?.error?.message ??
        error?.data?.message ??
        formatMessage({
          id: getTranslationKey('asset-details.replace.error'),
          defaultMessage: 'Failed to replace the file.',
        });
      notify({ type: 'danger', message });
      return;
    }
    notify({
      type: 'success',
      message: formatMessage({
        id: getTranslationKey('asset-details.replace.success'),
        defaultMessage: 'File replaced.',
      }),
    });
  };

  // Owns the delete: on error notify in-drawer (drawer stays), on success fire
  // a persistent global notification then close the drawer.
  const handleDelete = async () => {
    const res = await deleteMutation(asset.id);
    if ('error' in res) {
      const error = res.error as { data?: { error?: { message?: string }; message?: string } };
      const message =
        error?.data?.error?.message ??
        error?.data?.message ??
        formatMessage({
          id: getTranslationKey('asset-details.delete.error'),
          defaultMessage: 'Failed to delete the asset.',
        });
      notify({ type: 'danger', message });
      return;
    }
    toggleNotification({
      type: 'success',
      message: formatMessage(
        {
          id: getTranslationKey('asset-details.delete.success'),
          defaultMessage: '1 element have been deleted from {folderName}',
        },
        { folderName }
      ),
    });
    closeDetails();
  };

  const notifyCropError = () => {
    notify({
      type: 'danger',
      message: formatMessage({
        id: getTranslationKey('asset-details.crop.error'),
        defaultMessage: 'Failed to crop the file.',
      }),
    });
  };

  // Apply: replace the original binary with the cropped file + focal point.
  // Close the editor first so the drawer's busy overlay is visible while the
  // mutation runs (the editor renders in a Portal above the drawer).
  const handleCropApply = async (file: globalThis.File, focalPoint: FocalPoint) => {
    setIsCropOpen(false);
    const res = await replaceMutation({
      id: asset.id,
      file,
      fileInfo: { focalPoint },
    });
    if ('error' in res) {
      notifyCropError();
      return;
    }
    notify({
      type: 'success',
      message: formatMessage({
        id: getTranslationKey('asset-details.crop.success'),
        defaultMessage: 'File cropped.',
      }),
    });
  };

  // Save as copy: upload the cropped file as a new asset in the same folder.
  const handleCropSaveAsCopy = async (file: globalThis.File, focalPoint: FocalPoint) => {
    setIsCropOpen(false);
    const formData = new FormData();
    formData.append('files', file);
    formData.append(
      'fileInfo',
      JSON.stringify([{ name: asset.name, folder: initialValues.folder, focalPoint }])
    );
    const res = await uploadFiles({ formData, totalFiles: 1 });
    if ('error' in res) {
      notifyCropError();
      return;
    }
    notify({
      type: 'success',
      message: formatMessage({
        id: getTranslationKey('asset-details.crop.copy-success'),
        defaultMessage: 'Copy created.',
      }),
    });
  };

  const operations = React.useMemo<AssetOperations>(
    () => ({
      replaceAsset: handleReplace,
      deleteAsset: handleDelete,
      isReplacing,
      isDeleting,
    }),
    // handleReplace / handleDelete close over asset+mutations and don't need a
    // stable identity here; the consumers re-render with the new context value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isReplacing, isDeleting]
  );

  return (
    // `key={asset.id}` resets the form when the drawer switches to a different
    // asset so cached values from the previous asset don't bleed in.
    <DrawerNotifyContext.Provider value={notify}>
      <AssetOperationsContext.Provider value={operations}>
        <FormShell>
          <Form key={asset.id} method="POST" initialValues={initialValues} onSubmit={handleSubmit}>
            {({ modified, isSubmitting, values, resetForm }) => {
              const nameIsEmpty = ((values as AssetFormState).name ?? '').trim() === '';
              const busyMessage = getBusyMessage({ isDeleting, isReplacing, isCropCopying });
              return (
                <>
                  {/* Guards every close path (X button, ESC, route change, browser
                back) by intercepting the navigation when the form is dirty.
                `onProceed` resets the form so the held navigation can complete.
                Lives inside <Form> so it can read the form context. */}
                  <Blocker onProceed={resetForm} />
                  {isCropOpen && isImage ? (
                    <AssetCropEditor
                      asset={asset}
                      onClose={() => setIsCropOpen(false)}
                      onApply={handleCropApply}
                      onSaveAsCopy={handleCropSaveAsCopy}
                    />
                  ) : null}
                  {busyMessage ? (
                    <DrawerBusyOverlay>
                      <Loader>{formatMessage(busyMessage)}</Loader>
                    </DrawerBusyOverlay>
                  ) : null}
                  {drawerToast ? (
                    <DrawerToastSlot>
                      <Alert
                        variant={drawerToast.type === 'success' ? 'success' : 'danger'}
                        closeLabel={formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
                        onClose={() => setDrawerToast(null)}
                      >
                        {drawerToast.message}
                      </Alert>
                    </DrawerToastSlot>
                  ) : null}
                  <Drawer.ScrollableContent>
                    <AssetPreview
                      asset={asset}
                      actions={
                        isImage ? <AssetImageActions onCrop={() => setIsCropOpen(true)} /> : null
                      }
                    />
                    <Flex
                      direction="column"
                      alignItems="stretch"
                      gap={4}
                      paddingTop={4}
                      paddingBottom={4}
                      paddingLeft={5}
                      paddingRight={5}
                    >
                      <Typography variant="beta" fontWeight="semiBold" tag="h3">
                        {formatMessage({
                          id: getTranslationKey('asset-details.fileInfo'),
                          defaultMessage: 'File info',
                        })}
                      </Typography>
                      <Flex
                        wrap="wrap"
                        gap={4}
                        background="neutral100"
                        paddingTop={4}
                        paddingBottom={4}
                        paddingLeft={6}
                        paddingRight={6}
                        alignItems="flex-start"
                      >
                        <DetailItem
                          label={formatMessage({
                            id: getTranslationKey('asset-details.creationDate'),
                            defaultMessage: 'Creation date',
                          })}
                          value={
                            asset.createdAt
                              ? formatDate(new Date(asset.createdAt), {
                                  dateStyle: 'long',
                                  timeStyle: 'short',
                                })
                              : null
                          }
                        />
                        <DetailItem
                          label={formatMessage({
                            id: getTranslationKey('asset-details.lastUpdated'),
                            defaultMessage: 'Last updated',
                          })}
                          value={
                            asset.updatedAt
                              ? formatDate(new Date(asset.updatedAt), {
                                  dateStyle: 'long',
                                  timeStyle: 'short',
                                })
                              : null
                          }
                        />
                        <DetailItem
                          label={formatMessage({
                            id: getTranslationKey('asset-details.createdBy'),
                            defaultMessage: 'Created by',
                          })}
                          value={
                            asset.createdBy
                              ? (getDisplayName({
                                  firstname: asset.createdBy.firstname ?? undefined,
                                  lastname: asset.createdBy.lastname ?? undefined,
                                  username: asset.createdBy.username ?? undefined,
                                  email: asset.createdBy.email ?? undefined,
                                }) ?? '-')
                              : null
                          }
                        />
                        <DetailItem
                          label={formatMessage({
                            id: getTranslationKey('asset-details.size'),
                            defaultMessage: 'Size',
                          })}
                          value={asset.size ? formatBytes(asset.size, 1) : null}
                        />
                        {isImage && (asset.width != null || asset.height != null) && (
                          <DetailItem
                            label={formatMessage({
                              id: getTranslationKey('asset-details.dimensions'),
                              defaultMessage: 'Dimensions',
                            })}
                            value={
                              asset.width != null && asset.height != null
                                ? `${asset.width} × ${asset.height}`
                                : null
                            }
                          />
                        )}
                        <DetailItem
                          label={formatMessage({
                            id: getTranslationKey('asset-details.extension'),
                            defaultMessage: 'Extension',
                          })}
                          value={getFileExtension(asset.ext)}
                        />
                        <DetailItem
                          label={formatMessage({
                            id: getTranslationKey('asset-details.assetId'),
                            defaultMessage: 'Asset ID',
                          })}
                          value={String(asset.id)}
                        />
                      </Flex>
                      <DetailField
                        name="name"
                        label={formatMessage({
                          id: getTranslationKey('asset-details.fileName'),
                          defaultMessage: 'File name',
                        })}
                        required
                      />
                      <LocationField
                        label={formatMessage({
                          id: getTranslationKey('asset-details.location'),
                          defaultMessage: 'Location',
                        })}
                        rootLabel={formatMessage({
                          id: getTranslationKey('plugin.home'),
                          defaultMessage: 'Home',
                        })}
                        folders={folders}
                      />
                      {isImage && (
                        <>
                          <DetailField
                            name="caption"
                            label={formatMessage({
                              id: getTranslationKey('asset-details.caption'),
                              defaultMessage: 'Caption',
                            })}
                          />
                          <DetailField
                            name="alternativeText"
                            label={formatMessage({
                              id: getTranslationKey('asset-details.alternativeText'),
                              defaultMessage: 'Alternative text',
                            })}
                          />
                        </>
                      )}
                    </Flex>
                  </Drawer.ScrollableContent>
                  <Flex
                    justifyContent="space-between"
                    alignItems="center"
                    gap={2}
                    padding={3}
                    borderColor="neutral150"
                    borderStyle="solid"
                    borderWidth="1px 0 0 0"
                    background="neutral0"
                  >
                    <Flex gap={2}>
                      <DeleteAssetButton />
                      <CopyLinkButton asset={asset} />
                      <DownloadAssetButton asset={asset} />
                    </Flex>
                    <Button
                      type="submit"
                      variant="default"
                      loading={isSubmitting}
                      // File name is required; block submit when it's empty or whitespace so the API can't 400 on a blank value.
                      disabled={!modified || isSubmitting || nameIsEmpty}
                    >
                      {formatMessage({
                        id: getTranslationKey('asset-details.save'),
                        defaultMessage: 'Save changes',
                      })}
                    </Button>
                  </Flex>
                </>
              );
            }}
          </Form>
        </FormShell>
      </AssetOperationsContext.Provider>
    </DrawerNotifyContext.Provider>
  );
};

/* -------------------------------------------------------------------------------------------------
 * DrawerHeader
 * -----------------------------------------------------------------------------------------------*/

interface DrawerHeaderProps {
  asset: AssetWithPopulatedCreatedBy;
  closeDetails: () => void;
}

const DrawerHeader = ({ asset, closeDetails }: DrawerHeaderProps) => {
  const DocIcon = asset ? getAssetIcon(asset.mime, asset.ext) : FileError;
  return (
    <Flex
      gap={2}
      paddingLeft={5}
      paddingTop={3}
      paddingBottom={3}
      paddingRight={3}
      borderColor="neutral150"
      borderStyle="solid"
      borderWidth="0 0 1px 0"
    >
      <DocIcon width={20} height={20} />
      <Drawer.Title asChild>
        <Typography variant="omega" fontWeight="semiBold" overflow="hidden" ellipsis tag="h2">
          {asset.name}
        </Typography>
      </Drawer.Title>
      <Box marginLeft="auto">
        <Drawer.CloseButton onClose={closeDetails}>
          <ArrowLineRight />
        </Drawer.CloseButton>
      </Box>
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * DrawerContent
 * -----------------------------------------------------------------------------------------------*/

interface DrawerContentProps {
  assetId: number;
  closeDetails: () => void;
}

const DrawerContent = ({ assetId, closeDetails }: DrawerContentProps) => {
  const { formatMessage } = useIntl();
  const {
    data: asset,
    isLoading,
    error,
  } = useGetAssetQuery(assetId, {
    refetchOnMountOrArgChange: false,
    refetchOnReconnect: false,
    refetchOnFocus: false,
  });

  if (isLoading) {
    return (
      <Flex justifyContent="center" padding={8}>
        <Loader>{formatMessage({ id: 'app.loading', defaultMessage: 'Loading...' })}</Loader>
      </Flex>
    );
  }

  if (error || !asset) {
    return (
      <Flex direction="column" alignItems="stretch" gap={4} padding={4}>
        <Alert
          variant="danger"
          closeLabel={formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
          onClose={closeDetails}
        >
          {formatMessage({
            id: getTranslationKey('asset-details.error'),
            defaultMessage: 'Failed to load file details.',
          })}
        </Alert>
      </Flex>
    );
  }

  return (
    <>
      <DrawerHeader asset={asset} closeDetails={closeDetails} />
      <AssetDetails asset={asset} closeDetails={closeDetails} />
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * AssetDetailsDrawer
 * -----------------------------------------------------------------------------------------------*/

export const AssetDetailsDrawer = () => {
  const { formatMessage } = useIntl();
  const { assetId, isVisible, shouldRenderDrawer, onCloseAnimationEnd, closeDetails } =
    useAssetDetailsParam();

  if (!shouldRenderDrawer || assetId === null) {
    return null;
  }

  return (
    <Drawer.Root isVisible={isVisible} onClose={closeDetails}>
      {/* Wrapper div required: Dialog.Portal uses asChild and merges ref onto each child.
          VisuallyHidden does not forward refs, so we wrap it in a div that can receive the ref. */}
      <div>
        <VisuallyHidden>
          <Drawer.Title>
            {formatMessage({
              id: getTranslationKey('asset-details.title'),
              defaultMessage: 'File details',
            })}
          </Drawer.Title>
          <Drawer.Description>
            {formatMessage({
              id: getTranslationKey('asset-details.description'),
              defaultMessage: 'Displays file information and metadata',
            })}
          </Drawer.Description>
        </VisuallyHidden>
      </div>
      <Drawer.Body
        animationDirection="left"
        width="41.6rem"
        height="100vh"
        onAnimationEnd={onCloseAnimationEnd}
      >
        <DrawerContent assetId={assetId} closeDetails={closeDetails} />
      </Drawer.Body>
    </Drawer.Root>
  );
};
