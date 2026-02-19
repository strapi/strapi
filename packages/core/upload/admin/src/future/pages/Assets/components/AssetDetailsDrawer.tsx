import * as React from 'react';

import * as Dialog from '@radix-ui/react-dialog';
import { useNotification, useQueryParams, getDisplayName } from '@strapi/admin/strapi-admin';
import {
  Box,
  Field,
  Flex,
  Loader,
  TextInput,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import { ArrowLineRight, FileError, WarningCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { Drawer } from '../../../components/Drawer';
import { AssetType } from '../../../enums';
import { useGetAssetQuery, type AssetWithPopulatedCreatedBy } from '../../../services/assets';
import { formatBytes, getFileExtension } from '../../../utils/files';
import { getAssetIcon } from '../../../utils/getAssetIcon';
import { getTranslationKey } from '../../../utils/translations';

import { AssetPreview } from './AssetPreview';

// Name of the parameter to look for in the URL to open the drawer
const URL_PARAM = 'assetId';
// Closing animation duration to wait until the drawer is closed before removing the URL parameter
const CLOSE_ANIMATION_MS = 300;

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
    }, CLOSE_ANIMATION_MS);
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
 * AssetDetailsContent
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
  value: string | null | undefined;
  required?: boolean;
}

const DetailField = ({ name, label, value, required }: DetailFieldProps) => (
  <Field.Root name={name} required={required}>
    <Field.Label>{label}</Field.Label>
    <TextInput
      value={value ?? ''}
      // TODO: handle onChange
      onChange={() => {}}
      endAction={!value ? <StyledWarning /> : undefined}
      type="text"
    />
  </Field.Root>
);

interface AssetDetailsProps {
  asset: AssetWithPopulatedCreatedBy | undefined;
  error: unknown;
}

const AssetDetails = ({ asset, error }: AssetDetailsProps) => {
  const { formatMessage, formatDate } = useIntl();

  if (error || !asset) {
    return (
      <Flex
        direction="column"
        alignItems="stretch"
        gap={4}
        paddingBottom={4}
        paddingLeft={5}
        paddingRight={5}
      >
        <Typography textColor="danger600">
          {formatMessage({
            id: getTranslationKey('asset-details.error'),
            defaultMessage: 'Failed to load file details.',
          })}
        </Typography>
      </Flex>
    );
  }

  const isImage = asset.mime?.includes(AssetType.Image);

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
        value={asset.name}
        required
      />
      {isImage && (
        <>
          <DetailField
            name="caption"
            label={formatMessage({
              id: getTranslationKey('asset-details.caption'),
              defaultMessage: 'Caption',
            })}
            value={asset.caption}
          />
          <DetailField
            name="alternativeText"
            label={formatMessage({
              id: getTranslationKey('asset-details.alternativeText'),
              defaultMessage: 'Alternative text',
            })}
            value={asset.alternativeText}
          />
        </>
      )}
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * DrawerContent (Drawer.Header and Drawer.Content)
 * -----------------------------------------------------------------------------------------------*/

interface DrawerContentProps {
  assetId: number;
  closeDetails: () => void;
}

const DrawerContent = ({ assetId, closeDetails }: DrawerContentProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const {
    data: asset,
    isLoading,
    error,
  } = useGetAssetQuery(assetId, {
    refetchOnMountOrArgChange: false,
    refetchOnReconnect: false,
    refetchOnFocus: false,
  });

  React.useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'danger',
        message: formatMessage({
          id: getTranslationKey('asset-details.error'),
          defaultMessage: 'Failed to load file details.',
        }),
      });
      closeDetails();
    }
  }, [error, closeDetails, toggleNotification, formatMessage]);

  if (isLoading) {
    return (
      <>
        <VisuallyHidden>
          <Dialog.Title>
            {formatMessage({
              id: getTranslationKey('asset-details.title'),
              defaultMessage: 'File details',
            })}
          </Dialog.Title>
          <Dialog.Description>
            {formatMessage({
              id: getTranslationKey('asset-details.description'),
              defaultMessage: 'Displays file information and metadata',
            })}
          </Dialog.Description>
        </VisuallyHidden>
        <Drawer.Content>
          <Flex justifyContent="center" padding={8}>
            <Loader>{formatMessage({ id: 'app.loading', defaultMessage: 'Loading...' })}</Loader>
          </Flex>
        </Drawer.Content>
      </>
    );
  }

  const DocIcon = asset ? getAssetIcon(asset.mime, asset.ext) : FileError;

  return !error && asset ? (
    <>
      <Flex gap={2} paddingLeft={5} paddingTop={3} paddingBottom={3} paddingRight={3}>
        <DocIcon width={20} height={20} />
        <Dialog.Title asChild>
          <Typography variant="omega" fontWeight="semiBold" overflow="hidden" ellipsis tag="h2">
            {asset.name}
          </Typography>
        </Dialog.Title>
        <Box marginLeft="auto">
          <Drawer.CloseButton onClose={closeDetails}>
            <ArrowLineRight />
          </Drawer.CloseButton>
        </Box>
      </Flex>
      <VisuallyHidden>
        <Dialog.Description>
          {formatMessage({
            id: getTranslationKey('asset-details.description'),
            defaultMessage: 'Displays file information and metadata',
          })}
        </Dialog.Description>
      </VisuallyHidden>
      <Drawer.Content>
        <AssetPreview asset={asset} error={error} />
        <AssetDetails asset={asset} error={error} />
      </Drawer.Content>
    </>
  ) : null;
};

/* -------------------------------------------------------------------------------------------------
 * AssetDetailsDrawer
 * -----------------------------------------------------------------------------------------------*/

export const AssetDetailsDrawer = () => {
  const { assetId, isVisible, shouldRenderDrawer, closeDetails } = useAssetDetailsParam();

  if (!shouldRenderDrawer || assetId === null) {
    return null;
  }

  return (
    <Drawer.Root
      isVisible={isVisible}
      onClose={closeDetails}
      dataTestId="asset-details-drawer"
      width="41.6rem"
      height="100vh"
      animationDirection="left"
    >
      <DrawerContent assetId={assetId} closeDetails={closeDetails} />
    </Drawer.Root>
  );
};
