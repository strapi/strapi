import React from 'react';
import { CheckPagePermissions } from 'strapi-helper-plugin';
import pluginPermissions from '../../permissions';
import App from '../App';

const Main = () => {
  return (
    <CheckPagePermissions permissions={pluginPermissions.main}>
      <App />
    </CheckPagePermissions>
  );
};

export default Main;
