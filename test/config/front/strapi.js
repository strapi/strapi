/**
 *
 * Strapi
 * This file allow to mock any key that is in the global strapi variable
 *
 */

// Setup the strapi functioon global variable

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

global.strapi = {
  injectReducer: hoc,
  injectSaga: hoc,
  notification: {
    error: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
  },
};
