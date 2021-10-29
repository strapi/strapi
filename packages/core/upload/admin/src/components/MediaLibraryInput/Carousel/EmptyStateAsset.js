import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Icon } from '@strapi/parts/Icon';
import { Flex } from '@strapi/parts/Flex';
import { Text } from '@strapi/parts/Text';
import AddAsset from '@strapi/icons/AddAsset';
import getTrad from '../../../utils/getTrad';
import { rawFileToAsset } from '../../../utils/rawFileToAsset';
import { AssetSource } from '../../../constants';

export const EmptyStateAsset = ({ disabled, onAddAsset, onDropAsset, canRead }) => {
  const { formatMessage } = useIntl();
  const [dragOver, setDragOver] = useState(false);

  // The creating is determined with the capability to drop another asset in the field
  // Dropping an asset automatically opens the MediaLibrary upload dialog which is
  // constrained by RBAC in the ML lands
  const canCreate = Boolean(onDropAsset);

  const handleDragEnter = () => {
    setDragOver(true);
  };

  const handleDragLeave = e => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOver(false);
    }
  };

  const handleDrop = e => {
    if (e?.dataTransfer?.files) {
      const files = e.dataTransfer.files;
      const assets = [];

      for (let i = 0; i < files.length; i++) {
        const file = files.item(i);
        const asset = rawFileToAsset(file, AssetSource.Computer);

        assets.push(asset);
      }

      onDropAsset(assets);
    }

    setDragOver(false);
  };

  console.log('xtf', canCreate, canRead);

  return (
    <Flex
      borderStyle={dragOver ? 'dashed' : undefined}
      borderWidth={dragOver ? '1px' : undefined}
      borderColor={dragOver ? 'primary600' : undefined}
      direction="column"
      justifyContent="center"
      alignItems="center"
      height="100%"
      width="100%"
      as="button"
      type="button"
      onClick={canRead || canCreate ? onAddAsset : undefined}
      onDragEnter={canCreate ? handleDragEnter : undefined}
      onDragLeave={canCreate ? handleDragLeave : undefined}
      onDrop={canCreate ? handleDrop : undefined}
    >
      <Icon
        as={AddAsset}
        aria-hidden
        width="30px"
        height="24px"
        color={disabled ? 'neutral400' : 'primary600'}
        marginBottom={3}
      />
      <Text small bold textColor="neutral600" style={{ textAlign: 'center' }} as="span">
        {canCreate && canRead
          ? formatMessage({
              id: getTrad('mediaLibraryInput.placeholder'),
              defaultMessage: 'Click to select an asset or drag and drop one in this area',
            })
          : null}

        {canCreate && !canRead
          ? formatMessage({
              id: getTrad('mediaLibraryInput.noReadPermission'),
              defaultMessage: 'Click to add an asset or drag and drop one in this area',
            })
          : null}

        {!canCreate && canRead
          ? formatMessage({
              id: getTrad('mediaLibraryInput.noCreatePermission'),
              defaultMessage: 'Click to select an asset',
            })
          : null}

        {!canCreate && !canRead
          ? formatMessage({
              id: getTrad('mediaLibraryInput.noPermission'),
              defaultMessage: "You don't have the permission to edit this field",
            })
          : null}
      </Text>
    </Flex>
  );
};

EmptyStateAsset.defaultProps = {
  canRead: false,
  disabled: false,
  onAddAsset: undefined,
  onDropAsset: undefined,
};

EmptyStateAsset.propTypes = {
  canRead: PropTypes.bool,
  disabled: PropTypes.bool,
  onAddAsset: PropTypes.func,
  onDropAsset: PropTypes.func,
};
