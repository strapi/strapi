import React from 'react';
import { Route } from 'react-router-dom';

const createRoute = (Component, to, exact) => {
  return <Route component={Component} key={to} path={to} exact={exact || false} />;
};

export default createRoute;
