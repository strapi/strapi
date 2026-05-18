import * as React from 'react';

import { useNotification, useQueryParams, getDisplayName } from '@strapi/admin/strapi-admin';
import {
  Alert,
  Box,
  Button,
  Field,
  Flex,
  Loader,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import { ArrowLineRight, FileError, WarningCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { Drawer, DRAWER_CLOSE_ANIMATION_MS } from '../../../../components/Drawer';
import { AssetType } from '../../../../enums';
import { useGetAssetQuery, useUpdateAssetMutation } from '../../../../services/assets';
import { useGetAllFoldersQuery } from '../../../../services/folders';
import { formatBytes, getFileExtension } from '../../../../utils/files';
import { getAssetIcon } from '../../../../utils/getAssetIcon';
import { getTranslationKey } from '../../../../utils/translations';

import { AssetPreview } from './AssetPreview';

import type { AssetWithPopulatedCreatedBy } from '../../../../../../../shared/contracts/files';

/** String value used by the location select to represent root folder (Media Library). */
const ROOT_FOLDER_VALUE = '__root__';

// Name of the parameter to look for in the URL to open the drawer
const URL_PARAM = 'assetId';

/* -------------------------------------------------------------------------------------------------
 * useAssetDetailsParam - sync drawer visibility with URL ?{URL_PARAM}={id}
 * -----------------------------------------------------------------------------------------------*/

export const useAssetDetailsParam = () => {
  const [{ query }, setQuery] = useQueryParams<{ [URL_PARAM]?: string }>();

  const detailsId = query?.[URL_PARAM];
  const assetId = detailsId ? parseInt(detailsId, 10) : null;
  const hasValidId = assetId !== null && !Number.isNaN(assetId);

  const [isClosing, setIsClosing] = React.useState(false);
  const displayAssetId = React.useRef<number | null>(null);

  const isVisible = hasValidId && !isClosing;

  React.useEffect(() => {
    if (hasValidId) {
      displayAssetId.current = assetId;
    }
  }, [hasValidId, assetId]);

  const openDetails = React.useCallback(
    (id: number) => {
      setIsClosing(false);
      setQuery({ [URL_PARAM]: String(id) });
    },
    [setQuery]
  );

  const closeDetails = React.useCallback(() => {
    if (!hasValidId) return;
    setIsClosing(true);
  }, [hasValidId]);

  React.useEffect(() => {
    if (!isClosing) return;
    const timer = window.setTimeout(() => {
      setQuery({ [URL_PARAM]: undefined }, 'remove');
      setIsClosing(false);
      displayAssetId.current = null;
    }, DRAWER_CLOSE_ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [isClosing, setQuery]);

  const shouldRenderDrawer = hasValidId || isClosing;
  const drawerAssetId = isClosing ? (displayAssetId.current ?? assetId) : assetId;

  return {
    assetId: drawerAssetId,
    isVisible,
    shouldRenderDrawer,
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
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}

const DetailField = ({ name, label, value, onChange, required, disabled }: DetailFieldProps) => (
  <Field.Root name={name} required={required}>
    <Field.Label>{label}</Field.Label>
    <TextInput
      value={value}
      onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      endAction={!value ? <StyledWarning /> : undefined}
      type="text"
      disabled={disabled}
    />
  </Field.Root>
);

/* -------------------------------------------------------------------------------------------------
 * AssetDetails
 * -----------------------------------------------------------------------------------------------*/

interface AssetDetailsProps {
  asset: AssetWithPopulatedCreatedBy;
}

interface AssetFormState {
  name: string;
  caption: string;
  alternativeText: string;
  folder: number | null;
}

const buildFormState = (asset: AssetWithPopulatedCreatedBy): AssetFormState => ({
  name: asset.name ?? '',
  caption: asset.caption ?? '',
  alternativeText: asset.alternativeText ?? '',
  folder:
    typeof asset.folder === 'object' && asset.folder !== null
      ? ((asset.folder as { id: number }).id ?? null)
      : ((asset.folder as number | null | undefined) ?? null),
});

export const AssetDetails = ({ asset }: AssetDetailsProps) => {
  const { formatMessage, formatDate } = useIntl();
  const { toggleNotification } = useNotification();

  const [form, setForm] = React.useState<AssetFormState>(() => buildFormState(asset));

  React.useEffect(() => {
    setForm(buildFormState(asset));
  }, [asset.id]);

  const { data: folders = [] } = useGetAllFoldersQuery();
  const [updateAsset, { isLoading: isSaving }] = useUpdateAssetMutation();

  const isImage = asset.mime?.includes(AssetType.Image);

  const initial = React.useMemo(() => buildFormState(asset), [asset]);
  const dataChanged =
    form.name !== initial.name ||
    form.caption !== initial.caption ||
    form.alternativeText !== initial.alternativeText ||
    form.folder !== initial.folder;

  const handleFieldChange = <K extends keyof AssetFormState>(key: K, value: AssetFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const res = await updateAsset({
      id: asset.id,
      fileInfo: {
        name: form.name,
        caption: form.caption,
        alternativeText: form.alternativeText,
        folder: form.folder,
      },
    });

    if ('error' in res) {
      toggleNotification({
        type: 'danger',
        message: formatMessage({
          id: getTranslationKey('asset-details.update.error'),
          defaultMessage: 'Failed to update the asset.',
        }),
      });
      return;
    }

    toggleNotification({
      type: 'success',
      message: formatMessage({
        id: getTranslationKey('asset-details.update.success'),
        defaultMessage: 'Asset updated.',
      }),
    });
  };

  return (
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
              ? formatDate(new Date(asset.createdAt), { dateStyle: 'long', timeStyle: 'short' })
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
              ? formatDate(new Date(asset.updatedAt), { dateStyle: 'long', timeStyle: 'short' })
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
        name="fileName"
        label={formatMessage({
          id: getTranslationKey('asset-details.fileName'),
          defaultMessage: 'File name',
        })}
        value={form.name}
        onChange={(value) => handleFieldChange('name', value)}
        disabled={isSaving}
        required
      />
      <Field.Root name="location" required>
        <Field.Label>
          {formatMessage({
            id: getTranslationKey('asset-details.location'),
            defaultMessage: 'Location',
          })}
        </Field.Label>
        <SingleSelect
          value={form.folder === null ? ROOT_FOLDER_VALUE : String(form.folder)}
          onChange={(value) => {
            const next = value === ROOT_FOLDER_VALUE ? null : Number(value);
            handleFieldChange('folder', next);
          }}
          disabled={isSaving}
        >
          <SingleSelectOption value={ROOT_FOLDER_VALUE}>
            {formatMessage({
              id: getTranslationKey('asset-details.location.root'),
              defaultMessage: 'Media Library',
            })}
          </SingleSelectOption>
          {folders.map((folder) => (
            <SingleSelectOption key={folder.id} value={String(folder.id)}>
              {folder.name}
            </SingleSelectOption>
          ))}
        </SingleSelect>
      </Field.Root>
      {isImage && (
        <>
          <DetailField
            name="caption"
            label={formatMessage({
              id: getTranslationKey('asset-details.caption'),
              defaultMessage: 'Caption',
            })}
            value={form.caption}
            onChange={(value) => handleFieldChange('caption', value)}
            disabled={isSaving}
          />
          <DetailField
            name="alternativeText"
            label={formatMessage({
              id: getTranslationKey('asset-details.alternativeText'),
              defaultMessage: 'Alternative text',
            })}
            value={form.alternativeText}
            onChange={(value) => handleFieldChange('alternativeText', value)}
            disabled={isSaving}
          />
        </>
      )}

      <Flex justifyContent="flex-end" gap={2} paddingTop={2}>
        <Button
          variant="default"
          onClick={handleSave}
          loading={isSaving}
          disabled={!dataChanged || isSaving}
        >
          {formatMessage({
            id: getTranslationKey('asset-details.save'),
            defaultMessage: 'Save',
          })}
        </Button>
      </Flex>
    </Flex>
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
    <Flex gap={2} paddingLeft={5} paddingTop={3} paddingBottom={3} paddingRight={3}>
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
      <Drawer.ScrollableContent>
        <AssetPreview asset={asset} />
        <AssetDetails asset={asset} />
      </Drawer.ScrollableContent>
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * AssetDetailsDrawer
 * -----------------------------------------------------------------------------------------------*/

export const AssetDetailsDrawer = () => {
  const { formatMessage } = useIntl();
  const { assetId, isVisible, shouldRenderDrawer, closeDetails } = useAssetDetailsParam();

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
      <Drawer.Body animationDirection="left" width="41.6rem" height="100vh">
        <DrawerContent assetId={assetId} closeDetails={closeDetails} />
      </Drawer.Body>
    </Drawer.Root>
  );
};
