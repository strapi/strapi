import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { CardAsset } from '@strapi/design-system/Card';
import { Box } from '@strapi/design-system/Box';

import { AudioPreview } from './AudioPreview';
import { AssetCardBase } from './AssetCardBase';

const AudioPreviewWrapper = styled(Box)`
  canvas,
  audio {
    display: block;
    max-width: 100%;
    max-height: ${({ size }) => (size === 'M' ? 164 / 16 : 88 / 16)}rem;
  }
`;

export const AudioAssetCard = ({ name, url, size, ...restProps }) => {
  return (
    <AssetCardBase name={name} {...restProps} variant="Audio">
      <CardAsset size={size}>
        <AudioPreviewWrapper size={size}>
          <AudioPreview url={url} alt={name} />
        </AudioPreviewWrapper>
      </CardAsset>
    </AssetCardBase>
  );
};

AudioAssetCard.defaultProps = {
  onSelect: undefined,
  onEdit: undefined,
  onRemove: undefined,
  selected: false,
  size: 'M',
};

AudioAssetCard.propTypes = {
  extension: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  onSelect: PropTypes.func,
  onEdit: PropTypes.func,
  onRemove: PropTypes.func,
  url: PropTypes.string.isRequired,
  selected: PropTypes.bool,
  size: PropTypes.oneOf(['S', 'M']),
};
