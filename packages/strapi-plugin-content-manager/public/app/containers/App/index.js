/**
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 */

import React from 'react';
import { Provider } from 'react-redux';
import { store } from '../../app';

import '../../styles/main.scss';

export default class App extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    // Assign plugin component to children
    const childrenWithProps = React.Children.map(this.props.children,
      (child) => React.cloneElement(child, {
        exposedComponents: this.props.exposedComponents
      })
    );

    return (
      <Provider store={store}>
        <div className='content-manager'>
          {React.Children.toArray(childrenWithProps)}
        </div>
      </Provider>
    );
  }
}
