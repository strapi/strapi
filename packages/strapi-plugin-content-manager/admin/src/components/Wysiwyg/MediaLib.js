import React from 'react';
import { useStrapi } from 'strapi-helper-plugin';
import PropTypes from 'prop-types';

const MediaLib = ({ isOpen }) => {
  const {
    strapi: {
      componentApi: { getComponent },
    },
  } = useStrapi();

  const Component = getComponent('media-library').Component;

  if (Component) {
    return <Component isOpen={isOpen} multiple={false} onClosed={() => {}} />;
  }

  return null;
};

MediaLib.defaultProps = {
  isOpen: false,
};

MediaLib.propTypes = {
  isOpen: PropTypes.bool,
};

export default MediaLib;
