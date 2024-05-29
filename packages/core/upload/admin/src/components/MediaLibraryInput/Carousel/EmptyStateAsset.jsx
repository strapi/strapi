import React, { useState } from 'react';

import { Flex, Typography } from '@strapi/design-system';
import { PlusCircle as PicturePlus } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { AssetSource } from '../../../constants';
import getTrad from '../../../utils/getTrad';
import { rawFileToAsset } from '../../../utils/rawFileToAsset';

const TextAlignTypography = styled(Typography)`
  align-items: center;
`;

export const EmptyStateAsset = ({ disabled, onClick, onDropAsset }) => {
  const { formatMessage } = useIntl();
  const [dragOver, setDragOver] = useState(false);

  const handleDragEnter = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOver(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();

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
      tag="button"
      type="button"
      disabled={disabled}
      onClick={onClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      gap={3}
      style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      <PicturePlus
        aria-hidden
        width="3.2rem"
        height="3.2rem"
        fill={disabled ? 'neutral400' : 'primary600'}
      />
      <TextAlignTypography
        variant="pi"
        fontWeight="bold"
        textColor="neutral600"
        style={{ textAlign: 'center' }}
        tag="span"
      >
        {formatMessage({
          id: getTrad('mediaLibraryInput.placeholder'),
          defaultMessage: 'Click to add an asset or drag and drop one in this area',
        })}
      </TextAlignTypography>
    </Flex>
  );
};

EmptyStateAsset.defaultProps = {
  disabled: false,
  onDropAsset: undefined,
};

EmptyStateAsset.propTypes = {
  disabled: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  onDropAsset: PropTypes.func,
};
