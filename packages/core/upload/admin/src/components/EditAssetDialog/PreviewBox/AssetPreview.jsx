/* eslint-disable jsx-a11y/media-has-caption */
import React, { forwardRef } from 'react';

import { Flex } from '@strapi/design-system';
import { File, FilePdf } from '@strapi/icons';
import PropTypes from 'prop-types';
import { styled } from 'styled-components';

import { AssetType } from '../../../constants';
import { usePersistentState } from '../../../hooks/usePersistentState';

const CardAsset = styled(Flex)`
  border-radius: ${({ theme }) => theme.borderRadius} ${({ theme }) => theme.borderRadius} 0 0;
  background: linear-gradient(180deg, #ffffff 0%, #f6f6f9 121.48%);
`;

export const AssetPreview = forwardRef(({ mime, url, name, ...props }, ref) => {
  const [lang] = usePersistentState('strapi-admin-language', 'en');

  if (mime.includes(AssetType.Image)) {
    return <img ref={ref} src={url} alt={name} {...props} />;
  }

  if (mime.includes(AssetType.Video)) {
    return (
      <video controls src={url} ref={ref} {...props}>
        <track label={name} default kind="captions" srcLang={lang} src="" />
      </video>
    );
  }

  if (mime.includes(AssetType.Audio)) {
    return (
      <audio controls src={url} ref={ref} {...props}>
        {name}
      </audio>
    );
  }

  if (mime.includes('pdf')) {
    return (
      <CardAsset justifyContent="center" {...props}>
        <FilePdf aria-label={name} />
      </CardAsset>
    );
  }

  return (
    <CardAsset justifyContent="center" {...props}>
      <File aria-label={name} />
    </CardAsset>
  );
});

AssetPreview.displayName = 'AssetPreview';

AssetPreview.propTypes = {
  mime: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired,
};
