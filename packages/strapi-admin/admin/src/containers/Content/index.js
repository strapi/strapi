/*
 *
 * Content
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';

import { selectPlugins } from '../App/selectors';

import styles from './styles.scss';

export class Content extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    const style = this.props.showLeftMenu ? styles.content : styles.wrapper;

    return (
      <div className={style}>
        {React.Children.toArray(this.props.children)}
      </div>
    );
  }
}

Content.propTypes = {
  children: PropTypes.node.isRequired,
  showLeftMenu: PropTypes.bool.isRequired,
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
