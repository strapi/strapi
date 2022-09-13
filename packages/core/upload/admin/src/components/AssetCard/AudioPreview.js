/* eslint-disable jsx-a11y/media-has-caption */
import React from 'react';
import PropTypes from 'prop-types';
import { Box } from '@strapi/design-system/Box';

export const AudioPreview = ({ url, alt }) => {
  return (
    <Box>
      <audio controls src={url}>
        {alt}
      </audio>
    </Box>
  );
};

AudioPreview.defaultProps = {};

AudioPreview.propTypes = {
  alt: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired,
};
