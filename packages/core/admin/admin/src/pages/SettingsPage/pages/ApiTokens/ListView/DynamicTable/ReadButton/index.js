import React from 'react';
import Eye from '@strapi/icons/Eye';
import PropTypes from 'prop-types';
import DefaultButton from '../DefaultButton';

const ReadButton = ({ tokenName, tokenId }) => {
  return (
    <DefaultButton tokenName={tokenName} tokenId={tokenId}>
      <Eye />
    </DefaultButton>
  );
};

ReadButton.propTypes = {
  tokenName: PropTypes.string.isRequired,
  tokenId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default ReadButton;
