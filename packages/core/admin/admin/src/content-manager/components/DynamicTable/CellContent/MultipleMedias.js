import React from 'react';
import PropTypes from 'prop-types';
import { AvatarGroup } from '@strapi/parts/Avatar';
import Media from './Media';

const MultipleMedia = ({ value }) => {
  return (
    <AvatarGroup>
      {value.map(file => {
        return <Media key={file.id} {...file} />;
      })}
    </AvatarGroup>
  );
};

MultipleMedia.propTypes = {
  value: PropTypes.arrayOf(
    PropTypes.shape({
      alternativeText: PropTypes.string,
      ext: PropTypes.string.isRequired,
      formats: PropTypes.object,
      mime: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      url: PropTypes.string.isRequired,
    })
  ).isRequired,
};

export default MultipleMedia;
