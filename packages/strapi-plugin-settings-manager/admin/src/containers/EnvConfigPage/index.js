import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { LoadingIndicatorPage } from 'strapi-helper-plugin';
import useFetch from '../../hooks/useFetch';

const EnvConfigPage = ({
  match: {
    params: { slug, env },
  },
}) => {
  const { data, isLoading } = useFetch(
    [`configurations/${slug}/${env}`],
    [slug, env]
  );

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  console.log({ data });

  return <div>Env</div>;
};

EnvConfigPage.propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({
      env: PropTypes.string.isRequired,
      slug: PropTypes.string.isRequired,
    }),
  }),
};

export default memo(EnvConfigPage);
