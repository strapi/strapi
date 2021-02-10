import React from 'react';
import PropTypes from 'prop-types';

const CollapseContent = ({ label }) => {
  return <div>{label}</div>;
};

CollapseContent.propTypes = {
  label: PropTypes.string.isRequired,
};

export default CollapseContent;
