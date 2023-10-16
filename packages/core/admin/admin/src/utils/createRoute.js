import React, { useEffect, useState } from 'react';

import { LoadingIndicatorPage } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import { Route } from 'react-router-dom';

const LazyCompo = ({ loadComponent }) => {
  const [Compo, setCompo] = useState(null);

  useEffect(() => {
    const loadCompo = async () => {
      try {
        const loadedCompo = await loadComponent();

        // TODO the loaded component provided can currently come from a default or named export
        // We will move the entire codebase to use named exports only
        // Until then we support both cases with priority given to the existing default exports
        setCompo(() => loadedCompo?.default ?? loadedCompo);
      } catch (err) {
        // TODO return the error component
        console.log(err);
      }
    };

    loadCompo();
  }, [loadComponent]);

  if (Compo) {
    return <Compo />;
  }

  return <LoadingIndicatorPage />;
};

const createRoute = (Component, to, exact) => {
  return (
    <Route
      render={() => <LazyCompo loadComponent={Component} />}
      key={to}
      path={to}
      exact={exact || false}
    />
  );
};

LazyCompo.propTypes = {
  loadComponent: PropTypes.func.isRequired,
};

export default createRoute;
