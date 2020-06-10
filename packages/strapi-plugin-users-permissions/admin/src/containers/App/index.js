/**
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 */

import React from 'react';
import { WithPagePermissions } from 'strapi-helper-plugin';
import pluginPermissions from '../../permissions';
import Main from '../Main';

const App = () => {
  return (
    <WithPagePermissions permissions={pluginPermissions.main}>
      <Main />
    </WithPagePermissions>
  );
};

export default App;
