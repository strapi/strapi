import React from 'react';
import PropTypes from 'prop-types';
import { get, isArray, includes, isEmpty } from 'lodash';
import { prefixFileUrlWithBackendUrl } from 'strapi-helper-plugin';
import DefaultIcon from '../../icons/Na';
import {
  StyledMediaPreviewList,
  MediaPreviewFile,
  MediaPreviewImage,
  MediaPreviewItem,
  MediaPreviewText,
} from './StyledMediaPreviewList';

const IMAGE_PREVIEW_COUNT = 3;

function MediaPreviewList({ hoverable, files }) {
  const getFileType = fileName => (fileName ? fileName.split('.').slice(-1)[0] : null);

  const renderImage = image => {
    const { name, size, url } = image;
    const fileUrl = get(image, ['formats', 'thumbnail', 'url'], url);

    if (size > 2000) {
      return renderFile(image);
    }

    return (
      <MediaPreviewImage className={hoverable ? 'hoverable' : ''}>
        <div>
          <img src={prefixFileUrlWithBackendUrl(fileUrl)} alt={`${name}`} />
        </div>
        <img src={prefixFileUrlWithBackendUrl(fileUrl)} alt={`${name}`} />
      </MediaPreviewImage>
    );
  };

  const renderFile = file => {
    const { mime, name } = file;
    const fileType = includes(mime, 'image') ? 'image' : getFileType(name);

    return (
      <MediaPreviewFile className={hoverable ? 'hoverable' : ''}>
        {fileType ? (
          <div>
            <span>{fileType}</span>
          </div>
        ) : (
          <MediaPreviewItem>
            <DefaultIcon />
          </MediaPreviewItem>
        )}

        <span>{name}</span>
      </MediaPreviewFile>
    );
  };

  const renderItem = file => {
    const { mime } = file;

    return (
      <React.Fragment key={JSON.stringify(file)}>
        {includes(mime, 'image') ? renderImage(file) : renderFile(file)}
      </React.Fragment>
    );
  };

  const renderText = count => {
    return (
      <MediaPreviewText>
        <div>
          <span>+{count}</span>
        </div>
      </MediaPreviewText>
    );
  };

  const renderMultipleItems = files => {
    return files.map((file, index) => {
      return (
        <React.Fragment key={JSON.stringify(file)}>
          {index === IMAGE_PREVIEW_COUNT && files.length > IMAGE_PREVIEW_COUNT + 1
            ? renderText(files.length - IMAGE_PREVIEW_COUNT)
            : renderItem(file)}
        </React.Fragment>
      );
    });
  };

  return !!files && !isEmpty(files) ? (
    <StyledMediaPreviewList>
      {!isArray(files) ? renderItem(files) : renderMultipleItems(files)}
    </StyledMediaPreviewList>
  ) : (
    <MediaPreviewItem>
      <DefaultIcon />
    </MediaPreviewItem>
  );
}

MediaPreviewList.defaultProps = {
  hoverable: true,
  files: null,
};

MediaPreviewList.propTypes = {
  hoverable: PropTypes.bool,
  files: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

export default MediaPreviewList;
