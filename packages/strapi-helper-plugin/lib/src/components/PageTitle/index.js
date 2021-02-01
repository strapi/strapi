import React, { memo } from 'react';
import { Helmet } from 'react-helmet';
import PropTypes from 'prop-types';

const PageTitle = ({ title, favicon }) => (
  <Helmet title={title} link={[{ rel: 'icon', type: 'image/png', href: favicon }]} />
);

PageTitle.defaultProps = {
  favicon: '',
};

PageTitle.propTypes = {
  title: PropTypes.string.isRequired,
  favicon: PropTypes.string,
};

export default memo(PageTitle);
