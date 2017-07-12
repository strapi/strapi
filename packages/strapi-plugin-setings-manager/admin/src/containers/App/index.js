/**
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { pluginId } from 'app';
import PluginLeftMenu from 'components/PluginLeftMenu';
import styles from './styles.scss';

class App extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      value: false,
      value1: null,
    }
  }

  handleChange = ({ target }) => {
    this.setState({ value: target.value});
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
        <div className={styles.baseline}></div>
        <div className="container-fluid">
          <div className="row">
            <PluginLeftMenu />
          </div>
        </div>
        {React.Children.toArray(content)}
      </div>
    );
  }
}

App.contextTypes = {
  router: React.PropTypes.object.isRequired,
};

App.propTypes = {
  children: React.PropTypes.node.isRequired,
  exposedComponents: React.PropTypes.object.isRequired,
};

export function mapDispatchToProps(dispatch) {
  return {
    dispatch,
  };
}

const mapStateToProps = createStructuredSelector({});

// Wrap the component to inject dispatch and state into it
export default connect(mapStateToProps, mapDispatchToProps)(App);
