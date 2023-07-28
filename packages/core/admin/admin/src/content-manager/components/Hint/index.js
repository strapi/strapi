import React from 'react';

import { Typography } from '@strapi/design-system';
import PropTypes from 'prop-types';

export const Hint = ({ id, error, name, hint }) => {
  if (hint.length === 0 || error) {
    return null;
  }

  return (
    <Typography as="p" variant="pi" id={`${id || name}-hint`} textColor="neutral600">
      {hint}
    </Typography>
  );
};

Hint.defaultProps = {
  id: undefined,
  error: undefined,
  hint: '',
};

Hint.propTypes = {
  hint: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
  error: PropTypes.string,
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
};

export default Hint;
