import React from 'react';
import PropTypes from 'prop-types';
import { GridLayout } from '@strapi/parts/Layout';
import { KeyboardNavigable } from '@strapi/parts/KeyboardNavigable';
import { prefixFileUrlWithBackendUrl, getFileExtension } from '@strapi/helper-plugin';
import { ImageAssetCard } from './ImageAssetCard';
import { VideoAssetCard } from './VideoAssetCard';
import { DocAssetCard } from './DocAssetCard';

export const ListView = ({ assets }) => {
  return (
    <KeyboardNavigable tagName="article">
      <GridLayout>
        {assets.map(asset => {
          if (asset.mime.includes('video')) {
            return (
              <VideoAssetCard
                id={asset.id}
                key={asset.id}
                name={asset.name}
                extension={getFileExtension(asset.ext)}
                url={prefixFileUrlWithBackendUrl(asset.url)}
                mime={asset.mime}
              />
            );
          }

          if (asset.mime.includes('image')) {
            return (
              <ImageAssetCard
                id={asset.id}
                key={asset.id}
                name={asset.name}
                extension={getFileExtension(asset.ext)}
                height={asset.height}
                width={asset.width}
                thumbnail={prefixFileUrlWithBackendUrl(asset?.formats?.thumbnail?.url || asset.url)}
              />
            );
          }

          return (
            <DocAssetCard
              id={asset.id}
              key={asset.id}
              name={asset.name}
              extension={getFileExtension(asset.ext)}
            />
          );
        })}
      </GridLayout>
    </KeyboardNavigable>
  );
};

ListView.propTypes = {
  assets: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
};
