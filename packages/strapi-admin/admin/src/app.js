/**
 * app.js
 *
 * This is the entry file for the application when running the build
 * code.
 */

/* eslint-disable */
import 'babel-polyfill';
import { findIndex } from 'lodash';
import 'sanitize.css/sanitize.css';
import 'whatwg-fetch';
import {
  getAppPluginsSucceeded,
  unsetHasUserPlugin,
} from './containers/App/actions';
import { basename, store } from './createStore';
import './intlPolyfill';
import './public-path';
import './strapi';

const dispatch = store.dispatch;

// Don't inject plugins in development mode.
if (window.location.port !== '4000') {
  fetch(`${strapi.remoteURL}/config/plugins.json`, { cache: 'no-cache' })
    .then(response => {
      return response.json();
    })
    .then(plugins => {
      dispatch(getAppPluginsSucceeded(plugins));

      if (findIndex(plugins, ['id', 'users-permissions']) === -1) {
        dispatch(unsetHasUserPlugin());
      }

      const $body = document.getElementsByTagName('body')[0];

      (plugins || []).forEach(plugin => {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.onerror = function (oError) {
          const source = new URL(oError.target.src);
          const url = new URL(`${strapi.remoteURL}`);

          if (!source || !url) {
            throw new Error(`Impossible to load: ${oError.target.src}`);
          }

          // Remove tag.
          $body.removeChild(script);

          // New attempt with new src.
          const newScript = document.createElement('script');
          newScript.type = 'text/javascript';
          newScript.src = `${url.origin}${source.pathname}`;
          $body.appendChild(newScript);
        };

        script.src = plugin.source[process.env.NODE_ENV].indexOf('://') === -1 ?
          `${basename}${plugin.source[process.env.NODE_ENV]}`.replace('//', '/'): // relative
          plugin.source[process.env.NODE_ENV]; // absolute

        $body.appendChild(script);
      });
    })
    .catch(err => {
      console.log(err); // eslint-disable-line no-console
    });
}

export {
  dispatch,
};
