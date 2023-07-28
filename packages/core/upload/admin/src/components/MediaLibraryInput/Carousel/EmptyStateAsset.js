import React, { useState } from 'react';

import { Flex, Icon, Typography } from '@strapi/design-system';
import { PicturePlus } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

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
      as="button"
      type="button"
      disabled={disabled}
      onClick={onClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      <Icon
        as={PicturePlus}
        aria-hidden
        width="30px"
        height="24px"
        color={disabled ? 'neutral400' : 'primary600'}
        marginBottom={3}
      />
      <TextAlignTypography
        variant="pi"
        fontWeight="bold"
        textColor="neutral600"
        style={{ textAlign: 'center' }}
        as="span"
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
