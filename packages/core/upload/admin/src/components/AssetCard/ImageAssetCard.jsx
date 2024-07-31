import React from 'react';

import { CardAsset } from '@strapi/design-system';
import PropTypes from 'prop-types';

import { appendSearchParamsToUrl } from '../../utils';

import { AssetCardBase } from './AssetCardBase';

export const ImageAssetCard = ({ height, width, thumbnail, size, alt, isUrlSigned, ...props }) => {
  // appending the updatedAt param to the thumbnail URL prevents it from being cached by the browser (cache busting)
  // applied only if the url is not signed to prevent the signature from being invalidated
  const thumbnailUrl = isUrlSigned
    ? thumbnail
    : appendSearchParamsToUrl({
        url: thumbnail,
        params: { updatedAt: props.updatedAt },
      });

  return (
    <AssetCardBase {...props} subtitle={height && width && ` - ${width}✕${height}`} variant="Image">
      <CardAsset src={thumbnailUrl} size={size} alt={alt} />
    </AssetCardBase>
  );
};

ImageAssetCard.defaultProps = {
  height: undefined,
  width: undefined,
  selected: false,
  onEdit: undefined,
  onSelect: undefined,
  onRemove: undefined,
  size: 'M',
  updatedAt: undefined,
};

ImageAssetCard.propTypes = {
  alt: PropTypes.string.isRequired,
  extension: PropTypes.string.isRequired,
  height: PropTypes.number,
  name: PropTypes.string.isRequired,
  onEdit: PropTypes.func,
  onSelect: PropTypes.func,
  onRemove: PropTypes.func,
  width: PropTypes.number,
  thumbnail: PropTypes.string.isRequired,
  selected: PropTypes.bool,
  size: PropTypes.oneOf(['S', 'M']),
  updatedAt: PropTypes.string,
  isUrlSigned: PropTypes.bool.isRequired,
};
