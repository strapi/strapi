/*
 *
 * Form
 *
 */

import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { isEmpty, split } from 'lodash';
import { store } from 'app';

import PopUpForm from 'components/PopUpForm';
import { getAsyncInjectors } from 'utils/asyncInjectors';

import reducer from './reducer';
import sagas from './sagas';
import selectForm from './selectors';
import { setForm } from './actions';

import styles from './styles.scss';

const { injectReducer, injectSagas } = getAsyncInjectors(store);
injectReducer('form', reducer);
injectSagas(sagas);

export class Form extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.state = {
      showModal: false,
    };
  }

  componentDidMount() {
    if (this.props.hash) {

      // Get the formType within the hash
      this.props.setForm(this.props.hash);
      this.setState({ showModal: true });
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.hash !== this.props.hash) {
      if (!isEmpty(nextProps.hash)) {
        this.props.setForm(nextProps.hash);
        this.setState({ showModal: true });
      } else {
        this.setState({ showModal: false });
      }

    }
  }

  render() {
    // Ensure typeof(popUpFormType) is String
    const popUpFormType = split(this.props.hash, '::')[1] || '';

    return (
      <div className={styles.form}>
        <PopUpForm
          isOpen={this.state.showModal}
          toggle={this.props.toggle}
          popUpFormType={popUpFormType}
          routePath={`${this.props.routePath}/${this.props.hash}`}
          popUpHeaderNavLinks={this.props.popUpHeaderNavLinks}
        />
      </div>
    );
  }
}

const mapStateToProps = selectForm();

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      setForm,
    },
    dispatch
  );
}

Form.propTypes = {
  hash: React.PropTypes.string.isRequired,
  popUpHeaderNavLinks: React.PropTypes.array,
  routePath: React.PropTypes.string,
  setForm: React.PropTypes.func.isRequired,
  toggle: React.PropTypes.func.isRequired,
};

export default connect(mapStateToProps, mapDispatchToProps)(Form);
