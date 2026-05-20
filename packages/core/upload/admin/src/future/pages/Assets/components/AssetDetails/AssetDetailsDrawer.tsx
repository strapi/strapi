import * as React from 'react';

import {
  Blocker,
  Form,
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
import { ArrowLineRight, FileError, Download, Trash, WarningCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { Drawer } from '../../../../components/Drawer';
import { AssetType } from '../../../../enums';
import {
  useDeleteAssetMutation,
  useGetAssetQuery,
  useReplaceAssetMutation,
  useUpdateAssetMutation,
} from '../../../../services/assets';
import { useGetAllFoldersQuery } from '../../../../services/folders';
import { useGetSettingsQuery } from '../../../../services/settings';
import { formatBytes, getFileExtension } from '../../../../utils/files';
import { getAssetIcon } from '../../../../utils/getAssetIcon';
import { getTranslationKey } from '../../../../utils/translations';
import { useFolderInfo } from '../../hooks/useFolderInfo';

import { AssetPreview } from './AssetPreview';

import type { AssetWithPopulatedCreatedBy } from '../../../../../../../shared/contracts/files';

// Name of the parameter to look for in the URL to open the drawer
const URL_PARAM = 'assetId';

interface DrawerToast {
  type: 'success' | 'danger';
  message: string;
}

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

interface DeleteAssetButtonProps {
  asset: AssetWithPopulatedCreatedBy;
  folderId: number | null;
  closeDetails: () => void;
}

const DeleteAssetButton = ({ asset, folderId, closeDetails }: DeleteAssetButtonProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const [isOpen, setIsOpen] = React.useState(false);
  const [deleteAsset, { isLoading: isDeleting }] = useDeleteAssetMutation();
  const { title: folderName } = useFolderInfo(folderId);

  const handleConfirm = async () => {
    const res = await deleteAsset(asset.id);

    if ('error' in res) {
      const error = res.error as { data?: { error?: { message?: string }; message?: string } };
      const message =
        error?.data?.error?.message ??
        error?.data?.message ??
        formatMessage({
          id: getTranslationKey('asset-details.delete.error'),
          defaultMessage: 'Failed to delete the asset.',
        });
      toggleNotification({ type: 'danger', message });
      setIsOpen(false);
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
    setIsOpen(false);
    closeDetails();
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
 * ReplaceAssetButton
 * -----------------------------------------------------------------------------------------------*/

interface ReplaceAssetButtonProps {
  asset: AssetWithPopulatedCreatedBy;
  onNotify: (toast: DrawerToast) => void;
}

const ReplaceAssetButton = ({ asset, onNotify }: ReplaceAssetButtonProps) => {
  const { formatMessage } = useIntl();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [replaceAsset, { isLoading: isReplacing }] = useReplaceAssetMutation();
  const { data: settings } = useGetSettingsQuery();
  const aiEnabled = settings?.data?.aiMetadata ?? false;

  const handleTriggerClick = () => {
    setIsDialogOpen(true);
  };

  const handleContinue = () => {
    // Confirm first, then open the native picker so the user only commits to
    // replacing after acknowledging the warning. The actual POST runs in
    // `handleFileChange` once a file is selected.
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

    const res = await replaceAsset({ id: asset.id, file });

    if ('error' in res) {
      const error = res.error as { data?: { error?: { message?: string }; message?: string } };
      const message =
        error?.data?.error?.message ??
        error?.data?.message ??
        formatMessage({
          id: getTranslationKey('asset-details.replace.error'),
          defaultMessage: 'Failed to replace the file.',
        });
      onNotify({ type: 'danger', message });
      return;
    }

    onNotify({
      type: 'success',
      message: formatMessage({
        id: getTranslationKey('asset-details.replace.success'),
        defaultMessage: 'File replaced.',
      }),
    });
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
        <Download />
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
  const { toggleNotification } = useNotification();
  const { data: folders = [] } = useGetAllFoldersQuery();
  const [updateAsset] = useUpdateAssetMutation();

  // In-drawer toast slot
  const [drawerToast, setDrawerToast] = React.useState<DrawerToast | null>(null);
  React.useEffect(() => {
    if (!drawerToast) return;
    const timer = window.setTimeout(() => setDrawerToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [drawerToast]);

  const isImage = asset.mime?.includes(AssetType.Image);

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
    const res = await updateAsset({
      id: asset.id,
      fileInfo: {
        name: values.name,
        caption: values.caption,
        alternativeText: values.alternativeText,
        folder: values.folder,
      },
    });

    if ('error' in res) {
      toggleNotification({
        type: 'danger',
        message: formatMessage({
          id: getTranslationKey('asset-details.update.error'),
          defaultMessage: 'Failed to update the file.',
        }),
      });
      return;
    }

    toggleNotification({
      type: 'success',
      message: formatMessage({
        id: getTranslationKey('asset-details.update.success'),
        defaultMessage: 'File updated',
      }),
    });
  };

  return (
    // `key={asset.id}` resets the form when the drawer switches to a different
    // asset so cached values from the previous asset don't bleed in.
    <FormShell>
      <Form key={asset.id} method="POST" initialValues={initialValues} onSubmit={handleSubmit}>
        {({ modified, isSubmitting, values, resetForm }) => {
          const nameIsEmpty = ((values as AssetFormState).name ?? '').trim() === '';
          return (
            <>
              {/* Guards every close path (X button, ESC, route change, browser
                back) by intercepting the navigation when the form is dirty.
                `onProceed` resets the form so the held navigation can complete.
                Lives inside <Form> so it can read the form context. */}
              <Blocker onProceed={resetForm} />
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
                <AssetPreview asset={asset} />
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
                  <DeleteAssetButton
                    asset={asset}
                    folderId={initialValues.folder}
                    closeDetails={closeDetails}
                  />
                  <ReplaceAssetButton asset={asset} onNotify={setDrawerToast} />
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
