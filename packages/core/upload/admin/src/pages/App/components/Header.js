import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { stringify } from 'qs';
import { useLocation, NavLink } from 'react-router-dom';
import { useQueryParams } from '@strapi/helper-plugin';
import { HeaderLayout } from '@strapi/design-system/Layout';
import { Button } from '@strapi/design-system/Button';
import { Breadcrumbs, CrumbLink, Crumb } from '@strapi/design-system/v2/Breadcrumbs';
import { Stack } from '@strapi/design-system/Stack';
import { Link } from '@strapi/design-system/Link';
import ArrowLeft from '@strapi/icons/ArrowLeft';
import Plus from '@strapi/icons/Plus';
import { getTrad } from '../../../utils';
import { FolderDefinition } from '../../../constants';

export const Header = ({
  canCreate,
  onToggleEditFolderDialog,
  onToggleUploadAssetDialog,
  folder,
  folderParentsArray,
}) => {
  const { formatMessage } = useIntl();
  const { pathname } = useLocation();
  const [{ query }] = useQueryParams();
  const [currentFolder, parentFolder, ...rest] = [
    folderParentsArray.pop(),
    folderParentsArray.pop(),
    ...folderParentsArray,
  ];
  const nameCurrentFolder =
    currentFolder?.label?.length > 30
      ? `${currentFolder.label.slice(0, 30)}...`
      : currentFolder?.label;
  const nameParentFolder = parentFolder?.label;
  const backQuery = {
    ...query,
    folder: parentFolder?.id ?? undefined,
  };

  return (
    <HeaderLayout
      title={`${formatMessage({
        id: getTrad('plugin.name'),
        defaultMessage: `Media Library`,
      })}${nameCurrentFolder ? ` - ${nameCurrentFolder}` : ''}`}
      subtitle={
        <Breadcrumbs as="nav" label="Folder navigation">
          <CrumbLink as={NavLink} to={pathname}>
            Media Library
          </CrumbLink>
          {rest.length > 0 && <Crumb>...</Crumb>}
          {parentFolder && (
            <CrumbLink as={NavLink} to={`${pathname}?${stringify(backQuery, { encode: false })}`}>
              {nameParentFolder}
            </CrumbLink>
          )}
          {currentFolder && <Crumb>{nameCurrentFolder}</Crumb>}
        </Breadcrumbs>
      }
      navigationAction={
        folder && (
          <Link
            startIcon={<ArrowLeft />}
            to={`${pathname}?${stringify(backQuery, { encode: false })}`}
          >
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

Header.defaultProps = {
  folder: null,
  folderParentsArray: null,
};

Header.propTypes = {
  canCreate: PropTypes.bool.isRequired,
  folder: FolderDefinition,
  folderParentsArray: PropTypes.arrayOf(
    PropTypes.shape({ id: PropTypes.number, label: PropTypes.string })
  ),
  onToggleEditFolderDialog: PropTypes.func.isRequired,
  onToggleUploadAssetDialog: PropTypes.func.isRequired,
};
