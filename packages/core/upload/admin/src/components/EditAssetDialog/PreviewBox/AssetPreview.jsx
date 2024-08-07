/* eslint-disable jsx-a11y/media-has-caption */
import React, { forwardRef } from 'react';

import MuxPlayer from '@mux/mux-player-react';
import { Flex } from '@strapi/design-system';
import { File, FilePdf } from '@strapi/icons';
import PropTypes from 'prop-types';
import styled from 'styled-components';

import { AssetType } from '../../../constants';

const CardAsset = styled(Flex)`
  border-radius: ${({ theme }) => theme.borderRadius} ${({ theme }) => theme.borderRadius} 0 0;
  background: linear-gradient(180deg, #ffffff 0%, #f6f6f9 121.48%);
`;

export const AssetPreview = forwardRef(({ mime, url, name, ...props }, ref) => {
  if (mime.includes(AssetType.Image)) {
    return <img ref={ref} src={url} alt={name} {...props} />;
  }

  if (mime.includes(AssetType.Video) || mime.includes(AssetType.Audio)) {
    return (
      <MuxPlayer
        src={url}
        title={name}
        audio={mime.includes(AssetType.Audio)}
        accentColor="#4945FF"
        {...props}
      />
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
