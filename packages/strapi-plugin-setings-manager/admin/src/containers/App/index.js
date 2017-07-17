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
import { isEmpty, map } from 'lodash';
import { pluginId } from 'app';
import PluginLeftMenu from 'components/PluginLeftMenu';
import { define } from 'i18n';
import messages from '../../translations/en.json';

import { menuFetch, environmentsFetch } from './actions';
import { makeSelectSections, makeSelectEnvironments } from './selectors';
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

  componentWillReceiveProps(nextProps) {
    // redirect the user to the first general section
    if (!this.props.params.slug && !isEmpty(nextProps.sections)) {
      this.props.history.push(`${this.props.location.pathname}/${nextProps.sections[0].items[0].slug}`);
    }
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
        {/*

          <div className={styles.baseline}></div>
        */}
        <div className={`container-fluid ${styles.noPadding}`}>
          <div className="row">
            <PluginLeftMenu sections={this.props.sections} environments={this.props.environments} />
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
  history: React.PropTypes.object,
  location: React.PropTypes.object,
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
}

const mapStateToProps = createStructuredSelector({
  sections: makeSelectSections(),
  environments: makeSelectEnvironments(),
});

// Wrap the component to inject dispatch and state into it
export default connect(mapStateToProps, mapDispatchToProps)(App);
