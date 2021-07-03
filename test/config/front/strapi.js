/**
 *
 * Strapi
 * This file allow to mock any key that is in the global strapi variable
 *
 */

// Setup the strapi function global variable

import '@testing-library/jest-dom/extend-expect';

const React = require('react');
const hoistNonReactStatics = require('hoist-non-react-statics');

const hoc = () => WrappedComponent => {
  class HocInjector extends React.Component {
    static WrappedComponent = WrappedComponent;

    render() {
      return <WrappedComponent {...this.props} />;
    }
  }

  return hoistNonReactStatics(HocInjector, WrappedComponent);
};

// FIXME
global.process.env.STRAPI_ADMIN_ENABLED_EE_FEATURES = [];
global.process.env.ADMIN_PATH = '/admin/';

global.strapi = {
  backendURL: 'http://localhost:1337',
  injectReducer: hoc,
  injectSaga: hoc,
  notification: {
    error: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
  },
};
