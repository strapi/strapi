import React from 'react';
import PropTypes from 'prop-types';
import { LoadingIndicatorPage } from 'strapi-helper-plugin';
import useFetch from '../../hooks/useFetch';

const ConfigPage = ({
  match: {
    params: { slug },
  },
}) => {
  const { isLoading } = useFetch([`configurations/${slug}`]);

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }
  return <div>Coming soon</div>;
};

ConfigPage.propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({
      slug: PropTypes.string.isRequired,
    }),
  }),
};

export default ConfigPage;
