import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Route } from 'react-router-dom';
import { LoadingIndicatorPage } from '@strapi/helper-plugin';

const LazyCompo = ({ loadComponent }) => {
  const [Compo, setCompo] = useState(null);

  useEffect(() => {
    const loadCompo = async () => {
      try {
        const loadedCompo = await loadComponent();

        setCompo(() => loadedCompo.default);
      } catch (err) {
        console.log(err);
      }
    };

    loadCompo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
