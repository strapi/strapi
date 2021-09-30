import React from 'react';
import PropTypes from 'prop-types';
import { ModalLayout, ModalHeader, ModalBody, ModalFooter } from '@strapi/parts/ModalLayout';
import { Button } from '@strapi/parts/Button';
import { Text } from '@strapi/parts/Text';

// const image = [
//   { alt: 'sunrise', url: 'http://localhost:3000/sunriseimage' },
//   { alt: 'sunset', url: 'http://localhost:3000/sunsetimage' },
// ];

const MediaLibrary = ({
  // onTogglePopover,
  onToggleMediaLib,
  // onSubmitImage,
  // editorRef
}) => {
  return (
    <ModalLayout onClose={onToggleMediaLib} labelledBy="media-library" id="media-library">
      <ModalHeader>
        <Text>Media Library</Text>
      </ModalHeader>
      <ModalBody>
        {/* <Text>Choose your picture 🔥</Text> */}
        <Text>COMING SOON</Text>
      </ModalBody>
      <ModalFooter
        startActions={
          <Button onClick={onToggleMediaLib} variant="tertiary">
            Cancel
          </Button>
        }
        endActions={
          <Button
            id="insert-button"
            // onClick={() => onSubmitImage(image, editorRef, onToggleMediaLib, onTogglePopover)}
          >
            Insert
          </Button>
        }
      />
    </ModalLayout>
  );
};

MediaLibrary.propTypes = {
  // onTogglePopover: PropTypes.func.isRequired,
  onToggleMediaLib: PropTypes.func.isRequired,
  // onSubmitImage: PropTypes.func.isRequired,
  // editorRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
};

export default MediaLibrary;
