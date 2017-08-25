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
import { map } from 'lodash';
import { pluginId } from 'app';
import { define } from 'i18n';
import { storeData } from '../../utils/storeData';
import messages from '../../translations/en.json';
import styles from './styles.scss';
import { modelsFetch } from './actions';

define(map(messages, (message, id) => ({
  id,
  defaultMessage: message,
}
)));

class App extends React.Component {
  componentDidMount() {
    this.props.modelsFetch();
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
  modelsFetch: React.PropTypes.func,
};

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      modelsFetch,
    },
    dispatch
  )
}

const mapStateToProps = createStructuredSelector({});

// Wrap the component to inject dispatch and state into it
export default connect(mapStateToProps, mapDispatchToProps)(App);
