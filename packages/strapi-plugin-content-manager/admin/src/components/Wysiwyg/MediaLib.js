import React, { useState } from 'react';
import { useStrapi, prefixFileUrlWithBackendUrl } from 'strapi-helper-plugin';
import PropTypes from 'prop-types';

const MediaLib = ({ isOpen, onChange, onClosed, onToggle }) => {
  const {
    strapi: {
      componentApi: { getComponent },
    },
  } = useStrapi();
  const [data, setData] = useState(null);

  const Component = getComponent('media-library').Component;
  const handleInputChange = data => {
    console.log(data);

    if (data) {
      const { name, alternativeText, url } = data;
      const alt = alternativeText === '' ? name : alternativeText;

      setData({ alt, url: prefixFileUrlWithBackendUrl(url) });
    }
  };

  const handleClosed = () => {
    if (data) {
      onChange(data);
    }

    setData(null);
    onClosed();
  };

  if (Component) {
    return (
      <Component
        allowedTypes={['images', 'videos', 'files']}
        isOpen={isOpen}
        multiple={false}
        onClosed={handleClosed}
        onInputMediaChange={handleInputChange}
        onToggle={onToggle}
      />
    );
  }

  return null;
};

MediaLib.defaultProps = {
  isOpen: false,
  onClosed: () => {},
  onChange: () => {},
  onToggle: () => {},
};

MediaLib.propTypes = {
  isOpen: PropTypes.bool,
  onChange: PropTypes.func,
  onClosed: PropTypes.func,
  onToggle: PropTypes.func,
};

export default MediaLib;
