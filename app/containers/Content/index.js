/*
 *
 * Content
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import styles from './styles.css';

export class Content extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.content}>
        <p>Content</p>
      </div>
    );
  }
}


function mapDispatchToProps(dispatch) {
  return {
    dispatch,
  };
}

export default connect(mapDispatchToProps)(Content);
