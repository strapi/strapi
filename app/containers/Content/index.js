/*
 *
 * Content
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import styles from './styles.css';
import { createSelector } from 'reselect';
import { selectPlugins } from '../App/selectors';

export class Content extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    let plugin;

    this.props.plugins.map(p => {
      plugin = p;
      return p;
    });

    const Elem = plugin.mainComponent;

    return (
      <div className={styles.content}>
        <p>Content</p>
        <Elem></Elem>
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
