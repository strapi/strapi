/*
 *
 * Form
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import selectForm from './selectors';
import styles from './styles.scss';

export class Form extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.form}>
      </div>
    );
  }
}

const mapStateToProps = selectForm();

function mapDispatchToProps(dispatch) {
  return {
    dispatch,
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(Form);
