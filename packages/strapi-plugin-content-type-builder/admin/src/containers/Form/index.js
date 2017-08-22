/*
 *
 * Form
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { store } from 'app';

import PopUpForm from 'components/PopUpForm';
import { getAsyncInjectors } from 'utils/asyncInjectors';

import reducer from './reducer';
import sagas from './sagas';
import selectForm from './selectors';

import styles from './styles.scss';

const { injectReducer, injectSagas } = getAsyncInjectors(store);
injectReducer('form', reducer);
injectSagas(sagas);

export class Form extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.form}>
        <PopUpForm
          isOpen={this.props.isOpen}
          toggle={this.props.toggle}
          popUpFormType={this.props.popUpFormType}
        />
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

Form.propTypes = {
  isOpen: React.PropTypes.bool.isRequired,
  popUpFormType: React.PropTypes.string.isRequired,
  toggle: React.PropTypes.func.isRequired,
};

export default connect(mapStateToProps, mapDispatchToProps)(Form);
