import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Breadcrumbs, Crumb } from '@strapi/design-system/Breadcrumbs';
import { ModalHeader } from '@strapi/design-system/ModalLayout';
import { Stack } from '@strapi/design-system/Stack';
import { Icon } from '@strapi/design-system/Icon';
import ArrowLeft from '@strapi/icons/ArrowLeft';
import { findRecursiveFolderMetadatas, getTrad } from '../../utils';
import { useFolderStructure } from '../../hooks/useFolderStructure';

const BackButton = styled.button`
  height: ${({ theme }) => theme.spaces[4]};
  color: ${({ theme }) => theme.colors.neutral500};

  &:hover,
  &:focus {
    color: ${({ theme }) => theme.colors.neutral600};
  }
`;

const BackIcon = styled(Icon)`
  path {
    fill: currentColor;
  }
`;

export const DialogHeader = ({ currentFolder, onChangeFolder }) => {
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
          <BackButton
            aria-label={formatMessage({ id: 'modal.header.go-back', defaultMessage: 'Go back' })}
            type="button"
            onClick={() => onChangeFolder(folderMetadatas?.parentId)}
          >
            <BackIcon height="100%" as={ArrowLeft} />
          </BackButton>
        )}
        <Breadcrumbs
          label={`${formatMessage({
            id: getTrad('header.actions.add-assets'),
            defaultMessage: 'Add new assets',
          })}${
            folderLabel
              ? `, ${folderLabel} ${formatMessage({
                  id: 'header.actions.add-assets.folder',
                  defaultMessage: 'folder',
                })}`
              : ''
          }`}
        >
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

DialogHeader.defaultProps = {
  currentFolder: undefined,
  onChangeFolder: undefined,
};

DialogHeader.propTypes = {
  currentFolder: PropTypes.number,
  onChangeFolder: PropTypes.func,
};
