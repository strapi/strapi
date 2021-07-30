import React, { memo } from 'react';
import { Helmet } from 'react-helmet';
import PropTypes from 'prop-types';

const PageTitle = ({ title }) => {
  return <Helmet title={title} />;
};

PageTitle.propTypes = {
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]).isRequired,
};

export default memo(PageTitle);
