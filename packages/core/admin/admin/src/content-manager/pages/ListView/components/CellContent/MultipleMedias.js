import React from 'react';

import { AvatarGroup } from '@strapi/design-system';
import PropTypes from 'prop-types';

import Media from './Media';
import FileWrapper from './Media/FileWrapper';

const MultipleMedia = ({ value }) => {
  return (
    <AvatarGroup>
      {value.map((file, index) => {
        const key = `${file.id}${index}`;

        if (index === 3) {
          const remainingFiles = `+${value.length - 3}`;

          return (
            <FileWrapper key={key} preview={false}>
              {remainingFiles}
            </FileWrapper>
          );
        }

        if (index > 3) {
          return null;
        }

        return <Media key={key} {...file} />;
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
