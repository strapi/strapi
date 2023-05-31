import React from 'react';
import { Eye } from '@strapi/icons';
import PropTypes from 'prop-types';
import DefaultButton from '../DefaultButton';

const ReadButton = ({ tokenName, tokenId }) => {
  return (
    <DefaultButton tokenName={tokenName} tokenId={tokenId} buttonType="read">
      <Eye />
    </DefaultButton>
  );
};

ReadButton.propTypes = {
  tokenName: PropTypes.string.isRequired,
  tokenId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default ReadButton;
