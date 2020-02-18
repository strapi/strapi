/*
 * TODO: this component might be in conflict with the one needed in the CardPreview
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

const FileDetails = ({ file }) => {
  console.log(file);

  return <div>COMING SOON</div>;
};

FileDetails.defaultProps = {
  file: null,
};

FileDetails.propTypes = {
  file: PropTypes.instanceOf(File),
};

export default FileDetails;
