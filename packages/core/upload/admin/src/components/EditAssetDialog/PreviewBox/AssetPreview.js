import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import Book from '@strapi/icons/Book';
import { usePersistentState } from '@strapi/helper-plugin';
import { AssetType } from '../../../constants';

export const AssetPreview = forwardRef(({ mime, url, name }, ref) => {
  const [lang] = usePersistentState('strapi-admin-language', 'en');

  if (mime.includes(AssetType.Image)) {
    return <img ref={ref} src={url} alt={name} />;
  }

  if (mime.includes(AssetType.Video)) {
    return (
      <video controls src={url} ref={ref}>
        <track label={name} default kind="captions" srcLang={lang} src="" />
      </video>
    );
  }

  return <Book aria-label={name} />;
});

AssetPreview.displayName = 'AssetPreview';

AssetPreview.propTypes = {
  mime: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired,
};
