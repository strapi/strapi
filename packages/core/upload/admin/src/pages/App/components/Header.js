import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { stringify } from 'qs';
import { useLocation } from 'react-router-dom';
import { useQueryParams } from '@strapi/helper-plugin';
import { HeaderLayout } from '@strapi/design-system/Layout';
import { Button } from '@strapi/design-system/Button';
import { Stack } from '@strapi/design-system/Stack';
import { Link } from '@strapi/design-system/Link';
import ArrowLeft from '@strapi/icons/ArrowLeft';
import Plus from '@strapi/icons/Plus';
import { getTrad, findRecursiveFolderMetadatas } from '../../../utils';
import { useFolderStructure } from '../../../hooks/useFolderStructure';

export const Header = ({
  assetCount,
  folderCount,
  canCreate,
  onToggleEditFolderDialog,
  onToggleUploadAssetDialog,
}) => {
  const { formatMessage } = useIntl();
  const { pathname } = useLocation();
  const [
    {
      query: { folder, ...queryParamsWithoutFolder },
    },
  ] = useQueryParams();

  const { data, isLoading } = useFolderStructure();
  const isNestedFolder = !!folder;
  const folderMetadatas = !isLoading && findRecursiveFolderMetadatas(data[0], folder);
  const backQuery = stringify(
    folderMetadatas?.parentId
      ? { ...queryParamsWithoutFolder, folder: folderMetadatas.parentId }
      : { ...queryParamsWithoutFolder },
    { encode: false }
  );

  const folderLabel =
    folderMetadatas?.currentFolderLabel &&
    (folderMetadatas.currentFolderLabel.length > 30
      ? `${folderMetadatas.currentFolderLabel.slice(0, 30)}...`
      : folderMetadatas.currentFolderLabel);

  return (
    <HeaderLayout
      title={`${formatMessage({
        id: getTrad('plugin.name'),
        defaultMessage: `Media Library`,
      })}${folderLabel ? ` - ${folderLabel}` : ''}`}
      subtitle={formatMessage(
        {
          id: getTrad('header.content.assets'),
          defaultMessage:
            '{numberFolders, plural, one {1 folder} other {# folders}} - {numberAssets, plural, one {1 asset} other {# assets}}',
        },
        { numberAssets: assetCount, numberFolders: folderCount }
      )}
      navigationAction={
        isNestedFolder && (
          <Link startIcon={<ArrowLeft />} to={`${pathname}?${backQuery}`}>
            {formatMessage({
              id: getTrad('header.actions.folder-level-up'),
              defaultMessage: 'Back',
            })}
          </Link>
        )
      }
      primaryAction={
        canCreate && (
          <Stack horizontal spacing={2}>
            <Button startIcon={<Plus />} variant="secondary" onClick={onToggleEditFolderDialog}>
              {formatMessage({
                id: getTrad('header.actions.add-folder'),
                defaultMessage: 'Add new folder',
              })}
            </Button>

            <Button startIcon={<Plus />} onClick={onToggleUploadAssetDialog}>
              {formatMessage({
                id: getTrad('header.actions.add-assets'),
                defaultMessage: 'Add new assets',
              })}
            </Button>
          </Stack>
        )
      }
    />
  );
};

Header.propTypes = {
  assetCount: PropTypes.number.isRequired,
  folderCount: PropTypes.number.isRequired,
  canCreate: PropTypes.bool.isRequired,
  onToggleEditFolderDialog: PropTypes.func.isRequired,
  onToggleUploadAssetDialog: PropTypes.func.isRequired,
};
