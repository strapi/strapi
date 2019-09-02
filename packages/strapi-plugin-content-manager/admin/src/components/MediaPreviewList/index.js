import React from 'react';
import PropTypes from 'prop-types';
import { isArray, includes, isEmpty } from 'lodash';

import DefaultIcon from '../../assets/images/media/na.svg';

import {
  StyledMediaPreviewList,
  MediaPreviewImage,
  MediaPreviewItem,
} from './StyledMediaPreviewList';

function MediaPreviewList({ hoverable, files }) {
  const baseUrl = strapi.backendURL;

  const renderImage = image => {
    const { name, url } = image;

    return (
      <MediaPreviewImage className={hoverable ? 'hoverable' : ''}>
        <div>
          <img src={`${baseUrl}${url}`} alt={`${name}`} />
        </div>
        <img src={`${baseUrl}${url}`} alt={`${name}`} />
      </MediaPreviewImage>
    );
  };

  const renderMultipleList = files => {
    return files.map(file => {
      const { mime } = file;
      // Check file type
      return (
        <React.Fragment key={JSON.stringify(file)}>
          {includes(mime, 'image') ? renderImage(file) : <p>{mime}</p>}
        </React.Fragment>
      );
    });
  };

  return !!files && !isEmpty(files) ? (
    <StyledMediaPreviewList>
      {!isArray(files) ? renderImage(files) : renderMultipleList(files)}
    </StyledMediaPreviewList>
  ) : (
    <MediaPreviewItem>
      <img src={DefaultIcon} alt="default" />
    </MediaPreviewItem>
  );
}

MediaPreviewList.default = {
  hoverable: false,
  files: null,
};

MediaPreviewList.propTypes = {
  hoverable: PropTypes.bool,
  files: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

export default MediaPreviewList;
