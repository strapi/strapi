import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import IconDocumentation from '@strapi/icons/IconDocumentation';
import { AssetType } from '../../../constants';

export const AssetPreview = forwardRef(({ mime, url, name }, ref) => {
  if (mime.includes(AssetType.Image)) {
    return <img ref={ref} src={url} alt={name} />;
  }

  if (mime.includes(AssetType.Video)) {
    return (
      <video controls src={url} ref={ref}>
        <track label={name} default kind="captions" srcLang="en" src="" />
      </video>
    );
  }

  return <IconDocumentation aria-label={name} />;
});

AssetPreview.displayName = 'AssetPreview';

AssetPreview.propTypes = {
  mime: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired,
};
