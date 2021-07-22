import React, { memo } from 'react';
import { Helmet } from 'react-helmet';
import PropTypes from 'prop-types';

import favicon from '../../favicon.ico';

const PageTitle = ({ title }) => {
  return <Helmet title={title} link={[{ rel: 'icon', type: 'image/png', href: favicon }]} />;
};

PageTitle.propTypes = {
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]).isRequired,
};

export default memo(PageTitle);
