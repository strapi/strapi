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
  static propTypes = {
    children: React.PropTypes.node,
  };

  render() {
    return (
      <div className={styles.content}>
        {React.Children.toArray(this.props.children)}
      </div>
    );
  }
}

Content.propTypes = {
  plugins: React.PropTypes.object,
  onRegisterPluginClicked: React.PropTypes.func,
  params: React.PropTypes.object,
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
