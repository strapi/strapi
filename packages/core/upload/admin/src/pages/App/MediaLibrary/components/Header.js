import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { stringify } from 'qs';
import { useLocation } from 'react-router-dom';
import { useQueryParams } from '@strapi/helper-plugin';
import { HeaderLayout, Button, Flex, Link } from '@strapi/design-system';
import { ArrowLeft, Plus } from '@strapi/icons';
import { getTrad } from '../../../../utils';
import { FolderDefinition, BreadcrumbsDefinition } from '../../../../constants';
import { Breadcrumbs } from '../../../../components/Breadcrumbs';

export const Header = ({
  breadcrumbs,
  canCreate,
  folder,
  onToggleEditFolderDialog,
  onToggleUploadAssetDialog,
}) => {
  const { formatMessage } = useIntl();
  const { pathname } = useLocation();
  const [{ query }] = useQueryParams();
  const backQuery = {
    ...query,
    folder: folder?.parent?.id ?? undefined,
  };

  return (
    <HeaderLayout
      title={formatMessage({
        id: getTrad('plugin.name'),
        defaultMessage: `Media Library`,
      })}
      subtitle={
        breadcrumbs &&
        folder && (
          <Breadcrumbs
            as="nav"
            label={formatMessage({
              id: getTrad('header.breadcrumbs.nav.label'),
              defaultMessage: 'Folders navigation',
            })}
            breadcrumbs={breadcrumbs}
            currentFolderId={folder?.id}
          />
        )
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
          <Flex gap={2}>
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
          </Flex>
        )
      }
    />
  );
};

Header.defaultProps = {
  breadcrumbs: false,
  folder: null,
};

Header.propTypes = {
  breadcrumbs: PropTypes.oneOfType([BreadcrumbsDefinition, PropTypes.bool]),
  canCreate: PropTypes.bool.isRequired,
  folder: FolderDefinition,
  onToggleEditFolderDialog: PropTypes.func.isRequired,
  onToggleUploadAssetDialog: PropTypes.func.isRequired,
};
