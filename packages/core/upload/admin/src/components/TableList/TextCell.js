import React from 'react';
import PropTypes from 'prop-types';
import { Typography } from '@strapi/design-system/Typography';

export const TextCell = ({ content }) => {
  if (content) {
    return <Typography>{content}</Typography>;
  }

  return <Typography>-</Typography>;
};

TextCell.defaultProps = {
  content: '',
};

TextCell.propTypes = {
  content: PropTypes.string,
};
