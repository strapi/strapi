import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { prefixFileUrlWithBackendUrl } from 'strapi-helper-plugin';
import { Flex } from '@buffetjs/core';

import CardPreview from '../CardPreview';
import Chevron from './Chevron';

const InputFilePreview = ({ file, onClick, isSlider }) => {
  const fileUrl = prefixFileUrlWithBackendUrl(get(file, ['formats', 'small', 'url'], file.url));

  return (
    <Flex
      key={file.id}
      style={{ height: '100%' }}
      alignItems="center"
      justifyContent="space-between"
    >
      {isSlider && <Chevron side="left" onClick={() => onClick(false)} />}
      <CardPreview hasIcon url={fileUrl} type={file.mime} />
      {isSlider && <Chevron side="right" onClick={() => onClick(true)} />}
    </Flex>
  );
};

InputFilePreview.propTypes = {
  file: PropTypes.object,
  isSlider: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
};
InputFilePreview.defaultProps = {
  isSlider: false,
  file: null,
};

export default InputFilePreview;
