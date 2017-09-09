/**
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { createStructuredSelector } from 'reselect';
import { pluginId } from 'app';

import { makeSelectShouldRefetchContentType } from 'containers/Form/selectors';

import { storeData } from '../../utils/storeData';

import styles from './styles.scss';
import { modelsFetch } from './actions';
import { makeSelectMenu } from './selectors';

class App extends React.Component {
  componentDidMount() {
    this.props.modelsFetch();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.shouldRefetchContentType !== this.props.shouldRefetchContentType) {
      this.props.modelsFetch();
    }
  }


  componentWillUnmount() {
    // Empty the app localStorage
    storeData.clearAppStorage();
  }

  render() {
    // Assign plugin component to children
    const content = React.Children.map(this.props.children, child =>
      React.cloneElement(child, {
        exposedComponents: this.props.exposedComponents,
        menu: this.props.menu,
      })
    );

    return (
      <div className={`${pluginId} ${styles.app}`}>
        {React.Children.toArray(content)}
      </div>
    );
  }
}

App.contextTypes = {
  router: React.PropTypes.object.isRequired,
};

App.propTypes = {
  children: React.PropTypes.node,
  exposedComponents: React.PropTypes.object.isRequired,
  menu: React.PropTypes.array,
  modelsFetch: React.PropTypes.func,
  shouldRefetchContentType: React.PropTypes.bool,
};

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      modelsFetch,
    },
    dispatch
  )
}

const mapStateToProps = createStructuredSelector({
  menu: makeSelectMenu(),
  shouldRefetchContentType: makeSelectShouldRefetchContentType(),
});

// Wrap the component to inject dispatch and state into it
export default connect(mapStateToProps, mapDispatchToProps)(App);
