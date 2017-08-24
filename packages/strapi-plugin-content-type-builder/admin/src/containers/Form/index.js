/*
 *
 * Form
 *
 */

import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { camelCase, includes, isEmpty, split, toNumber, replace } from 'lodash';
import { store } from 'app';

import PopUpForm from 'components/PopUpForm';
import { getAsyncInjectors } from 'utils/asyncInjectors';

import reducer from './reducer';
import sagas from './sagas';
import selectForm from './selectors';
import {
  changeInput,
  connectionsFetch,
  contentTypeEdit,
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
      // Get the formType within the hash
      this.props.setForm(this.props.hash);
      this.setState({ showModal: true });

      // Fetch Model is the user is editing contentType
      if (includes(this.props.hash, 'edit')) {
        const contentTypeName = replace(split(this.props.hash, '::')[0], '#edit', '').toLowerCase();
        this.props.contentTypeFetch(contentTypeName)
      }
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

  handleBlur = ({ target }) => {
    if (target.name === 'name') {
      this.props.changeInput(target.name, camelCase(target.value), includes(this.props.hash, 'edit'));
    }
  }

  handleChange = ({ target }) => {
    const value = target.type === 'number' ? toNumber(target.value) : target.value;

    this.props.changeInput(target.name, value, includes(this.props.hash, 'edit'));
  }

  handleSubmit = () => {
    if (includes(this.props.hash, 'edit')) {
      this.props.contentTypeEdit();
    }
  }

  toggle = () => {
    this.props.toggle();

    // Set the didFetchModel props to false when the modal is closing so the store is emptied
    // Only for editing
    if (this.state.showModal && includes(this.props.hash, 'edit')) {
      this.props.resetDidFetchModelProp();
    }
  }

  render() {
    // Ensure typeof(popUpFormType) is String
    const popUpFormType = split(this.props.hash, '::')[1] || '';
    const popUpTitle = includes(this.props.hash, 'edit') ?
      `popUpForm.edit.${popUpFormType}.header.title` : `popUpForm.create.${popUpFormType}.header.title`;

    // Two kinds of values are available modifiedData and modifiedDataEdit
    // Allows the user to start creating a contentType and modifying an existing one at the same time

    const values = includes(this.props.hash, 'edit') ? this.props.modifiedDataEdit : this.props.modifiedData;

    return (
      <div className={styles.form}>
        <PopUpForm
          isOpen={this.state.showModal}
          toggle={this.toggle}
          popUpFormType={popUpFormType}
          popUpTitle={popUpTitle}
          routePath={`${this.props.routePath}/${this.props.hash}`}
          popUpHeaderNavLinks={this.props.popUpHeaderNavLinks}
          form={this.props.form}
          values={values}
          selectOptions={this.props.selectOptions}
          selectOptionsFetchSucceeded={this.props.selectOptionsFetchSucceeded}
          handleChange={this.handleChange}
          handleBlur={this.handleBlur}
          handleSubmit={this.handleSubmit}
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
      contentTypeEdit,
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
  contentTypeEdit: React.PropTypes.func,
  contentTypeFetch: React.PropTypes.func,
  form: React.PropTypes.oneOfType([
    React.PropTypes.array.isRequired,
    React.PropTypes.object.isRequired,
  ]),
  hash: React.PropTypes.string.isRequired,
  modifiedData: React.PropTypes.object,
  modifiedDataEdit: React.PropTypes.object,
  popUpHeaderNavLinks: React.PropTypes.array,
  resetDidFetchModelProp: React.PropTypes.func,
  routePath: React.PropTypes.string,
  selectOptions: React.PropTypes.array,
  selectOptionsFetchSucceeded: React.PropTypes.bool,
  setForm: React.PropTypes.func.isRequired,
  toggle: React.PropTypes.func.isRequired,
};

export default connect(mapStateToProps, mapDispatchToProps)(Form);
