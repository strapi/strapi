import React from 'react';
import { Pencil } from '@strapi/icons';
import PropTypes from 'prop-types';
import DefaultButton from '../DefaultButton';

const UpdateButton = ({ tokenName, tokenId }) => {
  return (
    <DefaultButton tokenName={tokenName} tokenId={tokenId}>
      <Pencil />
    </DefaultButton>
  );
};

UpdateButton.propTypes = {
  tokenName: PropTypes.string.isRequired,
  tokenId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default UpdateButton;
