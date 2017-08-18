/**
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import _ from 'lodash';

import { loadModels, updateSchema } from './actions';
import { makeSelectLoading } from './selectors';

const tryRequire = (path) => {
  try {
    return require(`containers/${path}.js`); // eslint-disable-line global-require
  } catch (err) {
    return null;
  }
};

class App extends React.Component {
  componentWillMount() {
    const config = tryRequire('../../../../config/admin.json');
    if (!_.isEmpty(_.get(config, 'admin.schema'))) {
      this.props.updateSchema(config.admin.schema);
    } else {
      this.props.loadModels();
    }
  }

  render() {
    let content = <div />;

    if (!this.props.loading) {
      // Assign plugin component to children
      content = React.Children.map(this.props.children, child =>
        React.cloneElement(child, {
          exposedComponents: this.props.exposedComponents,
        })
      );
    }

    return (
      <div className="content-manager">
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
  loading: React.PropTypes.bool.isRequired,
  loadModels: React.PropTypes.func.isRequired,
  updateSchema: React.PropTypes.func.isRequired,
};

export function mapDispatchToProps(dispatch) {
  return {
    loadModels: () => dispatch(loadModels()),
    updateSchema: (schema) => dispatch(updateSchema(schema)),
    dispatch,
  };
}

const mapStateToProps = createStructuredSelector({
  loading: makeSelectLoading(),
});

// Wrap the component to inject dispatch and state into it
export default connect(mapStateToProps, mapDispatchToProps)(App);
