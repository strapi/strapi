/* eslint-disable jsx-a11y/media-has-caption */
import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import FileIcon from '@strapi/icons/File';
import FilePdfIcon from '@strapi/icons/FilePdf';
import { Flex } from '@strapi/design-system';
import styled from 'styled-components';
import { usePersistentState } from '@strapi/helper-plugin';
import { AssetType } from '../../../constants';

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
        <FilePdfIcon aria-label={name} />
      </CardAsset>
    );
  }

  return (
    <CardAsset justifyContent="center" {...props}>
      <FileIcon aria-label={name} />
    </CardAsset>
  );
});

AssetPreview.displayName = 'AssetPreview';

AssetPreview.propTypes = {
  mime: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired,
};
