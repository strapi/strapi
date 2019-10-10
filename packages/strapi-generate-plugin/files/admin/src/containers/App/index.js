/////////////////////////////////////////////////////
// DISPLAY YOUR PLUGIN IN THE ADMINISTRATION PANEL //
/////////////////////////////////////////////////////
/*
1. Check the installed plugin in your package.json you will need to require them manually
2. Copy the following code in my-app/admin/src/plugins.js (don't forget to add the other installed plugins)

```
const injectReducer = require('./utils/injectReducer').default;
const useInjectReducer = require('./utils/injectReducer').useInjectReducer;
const injectSaga = require('./utils/injectSaga').default;
const useInjectSaga = require('./utils/injectSaga').useInjectSaga;
const { languages } = require('./i18n');

window.strapi = Object.assign(window.strapi || {}, {
  node: MODE || 'host',
  env: NODE_ENV,
  backendURL: BACKEND_URL === '/' ? window.location.origin : BACKEND_URL,
  languages,
  currentLanguage:
    window.localStorage.getItem('strapi-admin-language') ||
    window.navigator.language ||
    window.navigator.userLanguage ||
    'en',
  injectReducer,
  injectSaga,
  useInjectReducer,
  useInjectSaga,
});

module.exports = {
  'strapi-plugin-users-permissions': require('../../plugins/strapi-plugin-users-permissions/admin/src')
    .default,
  // Add the other plugins here
  // ...,
  // Add your newly created plugin here (the path is different than the others)
  'my-plugin': require('../../../plugins/my-plugin/admin/src').default,
};
```
*/

/**
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 */

import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { NotFound } from 'strapi-helper-plugin';
// Utils
import pluginId from '../../pluginId';
// Containers
import HomePage from '../HomePage';

const App = () => {
  return (
    <div className={pluginId}>
      <Switch>
        <Route path={`/plugins/${pluginId}`} component={HomePage} exact />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
};

export default App;
