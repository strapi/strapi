/*
 *
 * Form
 *
 */

import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { includes, isEmpty, split, toNumber, replace } from 'lodash';
import { store } from 'app';

import PopUpForm from 'components/PopUpForm';
import { getAsyncInjectors } from 'utils/asyncInjectors';

import reducer from './reducer';
import sagas from './sagas';
import selectForm from './selectors';
import {
  changeInput,
  connectionsFetch,
  contentTypeFetch,
  resetDidFetchModelProp,
  setForm,
} from './actions';

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
    // Get available db connections
    this.props.connectionsFetch();

    if (this.props.hash) {
      // if (includes(this.props.hash, 'create')) {
      // Get the formType within the hash
      this.props.setForm(this.props.hash);
      this.setState({ showModal: true });
      // }
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.hash !== this.props.hash) {
      if (!isEmpty(nextProps.hash)) {

        this.props.setForm(nextProps.hash);
        this.setState({ showModal: true });

        if (includes(nextProps.hash, 'edit') && !nextProps.didFetchModel) {
          const contentTypeName = replace(split(nextProps.hash, '::')[0], '#edit', '').toLowerCase();
          this.props.contentTypeFetch(contentTypeName)
        }
      } else {
        this.setState({ showModal: false });
      }

    }
  }

  handleChange = ({ target }) => {
    const value = target.type === 'number' ? toNumber(target.value) : target.value;
    this.props.changeInput(target.name, value);
  }

  toggle = () => {
    this.props.toggle();

    if (this.state.showModal && includes(this.props.hash, 'edit')) {
      this.props.resetDidFetchModelProp();
    }
  }

  render() {
    // Ensure typeof(popUpFormType) is String
    const popUpFormType = split(this.props.hash, '::')[1] || '';

    return (
      <div className={styles.form}>
        <PopUpForm
          isOpen={this.state.showModal}
          toggle={this.toggle}
          popUpFormType={popUpFormType}
          routePath={`${this.props.routePath}/${this.props.hash}`}
          popUpHeaderNavLinks={this.props.popUpHeaderNavLinks}
          form={this.props.form}
          values={this.props.modifiedData}
          selectOptions={this.props.selectOptions}
          selectOptionsFetchSucceeded={this.props.selectOptionsFetchSucceeded}
          handleChange={this.handleChange}
        />
      </div>
    );
  }
}

const mapStateToProps = selectForm();

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      changeInput,
      connectionsFetch,
      contentTypeFetch,
      resetDidFetchModelProp,
      setForm,
    },
    dispatch
  );
}

Form.propTypes = {
  changeInput: React.PropTypes.func.isRequired,
  connectionsFetch: React.PropTypes.func.isRequired,
  contentTypeFetch: React.PropTypes.func,
  form: React.PropTypes.oneOfType([
    React.PropTypes.array.isRequired,
    React.PropTypes.object.isRequired,
  ]),
  hash: React.PropTypes.string.isRequired,
  modifiedData: React.PropTypes.object,
  popUpHeaderNavLinks: React.PropTypes.array,
  resetDidFetchModelProp: React.PropTypes.func,
  routePath: React.PropTypes.string,
  selectOptions: React.PropTypes.array,
  selectOptionsFetchSucceeded: React.PropTypes.bool,
  setForm: React.PropTypes.func.isRequired,
  toggle: React.PropTypes.func.isRequired,
};

export default connect(mapStateToProps, mapDispatchToProps)(Form);
