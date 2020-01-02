import React from 'react';
import PropTypes from 'prop-types';

import WysiwygContext from '../../contexts/Wysiwyg';

function WysiwygProvider({ children, ...rest }) {
  return (
    <WysiwygContext.Provider value={rest}>{children}</WysiwygContext.Provider>
  );
}

WysiwygProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default WysiwygProvider;
