/*
 *
 * Content
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import styles from './styles.scss';
import { createSelector } from 'reselect';
import { selectPlugins } from 'containers/App/selectors';

export class Content extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    let plugin;

    // Detect plugin according to params
    this.props.plugins.map(p => {
      if (this.props.params.plugin === p.id) {
        plugin = p;
      }
    });

    let content;
    if (!this.props.params.plugin) {
      content = <p>Home</p>
    } else if (!plugin) {
      content = <p>Unknown plugin.</p>
    } else {
      const Elem = plugin.mainComponent;
      content = <Elem plugin={plugin}></Elem>;
    }

    return (
      <div className={styles.content}>
        {content}
      </div>
    );
  }
}

Content.propTypes = {
  plugins: React.PropTypes.object,
  onRegisterPluginClicked: React.PropTypes.func,
};

const mapStateToProps = createSelector(
  selectPlugins(),
  (plugins) => ({ plugins })
);

function mapDispatchToProps(dispatch) {
  return {
    dispatch,
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(Content);
