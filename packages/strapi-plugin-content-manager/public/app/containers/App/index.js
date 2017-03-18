/**
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 */

import React from 'react';
import { createStructuredSelector } from 'reselect';
import { loadModels } from './actions';
import { makeSelectModels } from './selectors';
import { connect } from 'react-redux';

import '../../styles/main.scss';

class App extends React.Component { // eslint-disable-line react/prefer-stateless-function
  componentWillMount() {
    this.props.loadModels();
  }

  render() {
    // Assign plugin component to children
    const childrenWithProps = React.Children.map(this.props.children,
      (child) => React.cloneElement(child, {
        exposedComponents: this.props.exposedComponents
      })
    );

    return (
      <div className='content-manager'>
        {React.Children.toArray(childrenWithProps)}
      </div>
    );
  }
}

App.propTypes = {
  children: React.PropTypes.node,
  loadModels: React.PropTypes.func,
};

export function mapDispatchToProps(dispatch) {
  return {
    loadModels: () => dispatch(loadModels()),
    dispatch,
  };
}

const mapStateToProps = createStructuredSelector({
  models: makeSelectModels(),
});

// Wrap the component to inject dispatch and state into it
export default connect(mapStateToProps, mapDispatchToProps)(App);
