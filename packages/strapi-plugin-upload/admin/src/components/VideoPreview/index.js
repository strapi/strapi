import React from 'react';
import PropTypes from 'prop-types';

import LoadingIndicator from '../LoadingIndicator';

import Wrapper from './Wrapper';

const VideoPreview = ({ url }) => {
  return (
    <Wrapper>
      <LoadingIndicator />
      {url}
    </Wrapper>
  );
};

VideoPreview.defaultProps = {
  url: null,
};

VideoPreview.propTypes = {
  url: PropTypes.string,
};

export default VideoPreview;
