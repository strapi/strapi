/**
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { bindActionCreators } from 'redux';
import { map } from 'lodash';
import 'flag-icon-css/css/flag-icon.css';
import 'react-select/dist/react-select.css';
import { pluginId } from 'app';
import PluginLeftMenu from 'components/PluginLeftMenu';
import { define } from 'i18n';
import messages from '../../translations/en.json';

import { menuFetch, environmentsFetch } from './actions';
import { makeSelectSections, makeSelectEnvironments, makeSelectLoading } from './selectors';
import styles from './styles.scss';
define(map(messages, (message, id) => ({
  id,
  defaultMessage: message,
}
)));


class App extends React.Component {
  componentDidMount() {
    this.props.menuFetch();
    this.props.environmentsFetch();
  }

  render() {
    if (this.props.loading) {
      return <div />;
    }
    // Assign plugin component to children
    const content = React.Children.map(this.props.children, child =>
      React.cloneElement(child, {
        exposedComponents: this.props.exposedComponents,
      })
    );

    return (
      <div className={`${pluginId} ${styles.app}`}>
        <div className={`container-fluid ${styles.noPadding}`}>
          <div className={styles.baseline}></div>
          <div className="row">
            <PluginLeftMenu sections={this.props.sections} environments={this.props.environments} envParams={this.props.params.env} />
            {React.Children.toArray(content)}
          </div>
        </div>
      </div>
    );
  }
}

App.contextTypes = {
  router: React.PropTypes.object.isRequired,
};

App.propTypes = {
  children: React.PropTypes.node.isRequired,
  environments: React.PropTypes.array,
  environmentsFetch: React.PropTypes.func,
  exposedComponents: React.PropTypes.object.isRequired,
  loading: React.PropTypes.bool,
  menuFetch: React.PropTypes.func,
  params: React.PropTypes.object,
  sections: React.PropTypes.array.isRequired,
};

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      menuFetch,
      environmentsFetch,
    },
    dispatch
  );
};

const mapStateToProps = createStructuredSelector({
  sections: makeSelectSections(),
  environments: makeSelectEnvironments(),
  loading: makeSelectLoading(),
});

// Wrap the component to inject dispatch and state into it
export default connect(mapStateToProps, mapDispatchToProps)(App);
