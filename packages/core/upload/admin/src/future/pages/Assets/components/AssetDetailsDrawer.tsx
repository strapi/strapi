import * as React from 'react';

import { useQueryParams } from '@strapi/admin/strapi-admin';
import { Flex, Loader, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { Drawer } from '../../../components/Drawer';
import { AssetType } from '../../../enums';
import { useGetAssetQuery } from '../../../services/assets';
import { formatBytes, getFileExtension } from '../../../utils/files';
import { getTranslationKey } from '../../../utils/translations';

// Name of the parameter to look for in the URL to open the drawer
const URL_PARAM = 'details';

/* -------------------------------------------------------------------------------------------------
 * useAssetDetailsParam - sync drawer visibility with URL ?{URL_PARAM}={id}
 * -----------------------------------------------------------------------------------------------*/

const CLOSE_ANIMATION_MS = 300;

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

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
}

const DetailRow = ({ label, value }: DetailRowProps) => (
  <Flex direction="column" gap={1} paddingBottom={3}>
    <Typography variant="pi" textColor="neutral600" fontWeight="semiBold">
      {label}
    </Typography>
    <Typography variant="pi" textColor="neutral800">
      {value ?? '-'}
    </Typography>
  </Flex>
);

interface AssetDetailsContentProps {
  assetId: number;
}

const AssetDetailsContent = ({ assetId }: AssetDetailsContentProps) => {
  const { formatMessage, formatDate } = useIntl();
  const { data: asset, isLoading, error } = useGetAssetQuery(assetId);

  if (isLoading) {
    return (
      <Flex justifyContent="center" padding={8}>
        <Loader>{formatMessage({ id: 'app.loading', defaultMessage: 'Loading...' })}</Loader>
      </Flex>
    );
  }

  if (error || !asset) {
    return (
      <Typography textColor="danger600">
        {formatMessage({
          id: getTranslationKey('details.error'),
          defaultMessage: 'Failed to load asset details.',
        })}
      </Typography>
    );
  }

  const isImage = asset.mime?.includes(AssetType.Image);
  const isVideo = asset.mime?.includes(AssetType.Video);
  const isAudio = asset.mime?.includes(AssetType.Audio);

  const duration = (asset.provider_metadata as { duration?: number } | undefined)?.duration;

  return (
    <Flex direction="column" gap={0}>
      <DetailRow
        label={formatMessage({
          id: getTranslationKey('details.name'),
          defaultMessage: 'Name',
        })}
        value={asset.name}
      />
      <DetailRow
        label={formatMessage({
          id: getTranslationKey('details.size'),
          defaultMessage: 'Size',
        })}
        value={asset.size ? formatBytes(asset.size, 1) : null}
      />
      {isImage && (asset.width != null || asset.height != null) && (
        <DetailRow
          label={formatMessage({
            id: getTranslationKey('details.dimensions'),
            defaultMessage: 'Dimensions',
          })}
          value={
            asset.width != null && asset.height != null ? `${asset.width} × ${asset.height}` : null
          }
        />
      )}
      {(isVideo || isAudio) && duration != null && (
        <DetailRow
          label={formatMessage({
            id: getTranslationKey('details.duration'),
            defaultMessage: 'Duration',
          })}
          value={`${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`}
        />
      )}
      <DetailRow
        label={formatMessage({
          id: getTranslationKey('details.createdAt'),
          defaultMessage: 'Date of creation',
        })}
        value={
          asset.createdAt
            ? formatDate(new Date(asset.createdAt), { dateStyle: 'long', timeStyle: 'short' })
            : null
        }
      />
      <DetailRow
        label={formatMessage({
          id: getTranslationKey('details.updatedAt'),
          defaultMessage: 'Date of modification',
        })}
        value={
          asset.updatedAt
            ? formatDate(new Date(asset.updatedAt), { dateStyle: 'long', timeStyle: 'short' })
            : null
        }
      />
      <DetailRow
        label={formatMessage({
          id: getTranslationKey('details.extension'),
          defaultMessage: 'Extension',
        })}
        value={getFileExtension(asset.ext)}
      />
      <DetailRow
        label={formatMessage({
          id: getTranslationKey('details.id'),
          defaultMessage: 'ID',
        })}
        value={String(asset.id)}
      />
      {isImage && (
        <>
          <DetailRow
            label={formatMessage({
              id: getTranslationKey('details.caption'),
              defaultMessage: 'Caption',
            })}
            value={asset.caption}
          />
          <DetailRow
            label={formatMessage({
              id: getTranslationKey('details.alternativeText'),
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
 * AssetDetailsDrawer
 * -----------------------------------------------------------------------------------------------*/

export const AssetDetailsDrawer = () => {
  const { formatMessage } = useIntl();
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
    >
      <Drawer.Header>
        <Drawer.HeaderPreset
          title={formatMessage({
            id: getTranslationKey('details.title'),
            defaultMessage: 'Asset details',
          })}
          actions={<Drawer.CloseButton onClose={closeDetails} />}
        />
      </Drawer.Header>
      <Drawer.Content>
        <AssetDetailsContent assetId={assetId} />
      </Drawer.Content>
    </Drawer.Root>
  );
};
