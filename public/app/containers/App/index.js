/**
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 */

import React from 'react';
import { Provider } from 'react-redux';
import { store } from '../../app';
import appMessages from 'containers/App/messages.json';
import { define } from '../../i18n';
define(appMessages);

import '../../styles/main.scss';

export default class App extends React.Component { // eslint-disable-line react/prefer-stateless-function

  static propTypes = {
    children: React.PropTypes.node,
  };

  render() {
    return (
      <Provider store={store}>
        <div>
          {React.Children.toArray(this.props.children)}
        </div>
      </Provider>
    );
  }
}
