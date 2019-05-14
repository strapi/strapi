import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import { mount, shallow } from 'enzyme';

import App from '../index';

const messages = {
  'app.components.NotFoundPage.back': 'Back to homepage',
  'app.components.NotFoundPage.description': 'Not Found',
};

const renderComponent = properties =>
  mount(
    React.createElement(
      props => (
        <IntlProvider locale='en' defaultLocale='en' messages={messages}>
          <Router>
            <App {...props} />
          </Router>
        </IntlProvider>
      ),
      properties,
    ),
  );

describe('<App />', () => {
  let props;

  beforeEach(() => {
    props = {
      history: {
        push: jest.fn(),
      },
      location: {
        pathname: '/plugins/users-permissions',
      },
    };
  });

  it('should not crash', () => {
    shallow(<App {...props} />);
  });

  it('should redirect the user on mount if the url has two params', () => {
    const renderedComponent = renderComponent(props);

    expect(props.history.push).toHaveBeenCalledWith('/plugins/users-permissions/roles');

    renderedComponent.unmount();
  });

  it('should not redirect the user on mount if the url more than two params', () => {
    const otherProps = Object.assign(props, {
      location: { pathname: '/plugins/users-permissions/roles' },
    });
    const renderedComponent = renderComponent(otherProps);

    expect(props.history.push).not.toHaveBeenCalled();

    renderedComponent.unmount();
  });

  it('should redirect the user on update if the url more has two params', () => {
    const otherProps = Object.assign(props, {
      location: { pathname: '/plugins/users-permissions/roles' },
    });
    const renderedComponent = renderComponent(otherProps);

    renderedComponent.setProps({ location: { pathname: '/plugins/users-permissions' } });

    expect(props.history.push).toHaveBeenCalledWith('/plugins/users-permissions/roles');

    renderedComponent.unmount();
  });

  it('should n ot redirect the user on update if the url more has more than two params', () => {
    const otherProps = Object.assign(props, {
      location: { pathname: '/plugins/users-permissions/roles' },
    });
    const renderedComponent = renderComponent(otherProps);

    renderedComponent.setProps({ location: { pathname: '/plugins/users-permissions/auth/login' } });
    expect(props.history.push).not.toHaveBeenCalled();

    renderedComponent.unmount();
  });
});
