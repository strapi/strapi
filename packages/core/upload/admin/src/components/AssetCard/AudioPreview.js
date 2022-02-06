/* eslint-disable jsx-a11y/media-has-caption */
import React from 'react';
import PropTypes from 'prop-types';
import { Box } from '@strapi/design-system/Box';
import { VisuallyHidden } from '@strapi/design-system/VisuallyHidden';

export const AudioPreview = ({ url, mime, alt }) => {
  return (
    <Box>
      <audio controls>
        <source src={url} type={mime} />
      </audio>
      <VisuallyHidden as="figcaption">{alt}</VisuallyHidden>
    </Box>
  );
};

AudioPreview.defaultProps = {};

AudioPreview.propTypes = {
  alt: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired,
  mime: PropTypes.string.isRequired,
};
