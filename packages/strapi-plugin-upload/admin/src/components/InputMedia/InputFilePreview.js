import React from 'react';
import PropTypes from 'prop-types';

import CardPreview from '../CardPreview';
import Flex from '../Flex';
import Chevron from './Chevron';

const InputFilePreview = ({ file, onClick, isSlider }) => {
  const fileUrl = file.url.startsWith('/') ? `${strapi.backendURL}${file.url}` : file.url;

  return (
    <Flex
      key={file.id}
      style={{ height: '100%' }}
      alignItems="center"
      justifyContent="space-between"
    >
      {isSlider && <Chevron side="left" onClick={() => onClick(false)} />}
      <CardPreview url={fileUrl} type={file.mime} />
      {isSlider && <Chevron side="right" onClick={() => onClick(true)} />}
    </Flex>
  );
};

InputFilePreview.propTypes = {
  file: PropTypes.object.isRequired,
  isSlider: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
};
InputFilePreview.defaultProps = {
  isSlider: false,
};

export default InputFilePreview;
