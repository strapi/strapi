import React from 'react';
import PropTypes from 'prop-types';
import { isArray, includes, isEmpty } from 'lodash';

import DefaultIcon from '../../assets/images/media/na.svg';

import {
  StyledMediaPreviewList,
  MediaPreviewItem,
} from './StyledMediaPreviewList';

function MediaPreviewList({ hoverable, files }) {
  const baseUrl = strapi.backendURL;

  const renderImage = image => {
    const { ext, mime, name, url } = image;

    return (
      <MediaPreviewItem>
        {includes(mime, 'image') ? (
          <>
            <div>
              <img src={`${baseUrl}${url}`} alt={`${name}`} />
            </div>
            <img src={`${baseUrl}${url}`} alt={`${name}`} />
          </>
        ) : (
          <div>{ext}</div>
        )}
      </MediaPreviewItem>
    );
  };

  const renderMultipleList = images => {
    return images.map(image => {
      return (
        <React.Fragment key={JSON.stringify(image)}>
          {renderImage(image)}
        </React.Fragment>
      );
    });
  };

  return !!files && !isEmpty(files) ? (
    <StyledMediaPreviewList className={hoverable ? 'hoverable' : ''}>
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
