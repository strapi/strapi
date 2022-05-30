import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Breadcrumbs, Crumb } from '@strapi/design-system/Breadcrumbs';
import { ModalHeader } from '@strapi/design-system/ModalLayout';
import { Stack } from '@strapi/design-system/Stack';
import { Icon } from '@strapi/design-system/Icon';
import ArrowLeft from '@strapi/icons/ArrowLeft';
import getTrad from '../../utils/getTrad';
import { findRecursiveFolderMetadatas } from '../../utils';
import { useFolderStructure } from '../../hooks/useFolderStructure';

export const DialogTitle = ({ currentFolder, onChangeFolder }) => {
  const { formatMessage } = useIntl();

  const { data, isLoading } = useFolderStructure();

  const folderMetadatas = !isLoading && findRecursiveFolderMetadatas(data[0], currentFolder);
  const folderLabel =
    folderMetadatas?.currentFolderLabel &&
    (folderMetadatas.currentFolderLabel.length > 60
      ? `${folderMetadatas.currentFolderLabel.slice(0, 60)}...`
      : folderMetadatas.currentFolderLabel);

  return (
    <ModalHeader>
      <Stack horizontal spacing={4}>
        {currentFolder && (
          <button type="button" onClick={() => onChangeFolder(folderMetadatas?.parentId)}>
            <Icon color="neutral500" as={ArrowLeft} />
          </button>
        )}
        <Breadcrumbs label="Category model, name field">
          <Crumb>
            {formatMessage({
              id: getTrad('header.actions.add-assets'),
              defaultMessage: 'Add new assets',
            })}
          </Crumb>
          {folderLabel && <Crumb>{folderLabel}</Crumb>}
        </Breadcrumbs>
      </Stack>
    </ModalHeader>
  );
};

DialogTitle.defaultProps = {
  currentFolder: undefined,
  onChangeFolder: undefined,
};

DialogTitle.propTypes = {
  currentFolder: PropTypes.number,
  onChangeFolder: PropTypes.func,
};
