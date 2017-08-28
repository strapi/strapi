/*
 *
 * Form
 *
 */

import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import {
  camelCase,
  findIndex,
  get,
  includes,
  isEmpty,
  map,
  size,
  split,
  toNumber,
  replace,
} from 'lodash';

import { router, store } from 'app';

import { storeTemporaryMenu } from 'containers/App/actions';

import AttributeCard from 'components/AttributeCard';
import PopUpForm from 'components/PopUpForm';

import { getAsyncInjectors } from 'utils/asyncInjectors';

import { storeData } from '../../utils/storeData';

import reducer from './reducer';
import sagas from './sagas';
import selectForm from './selectors';
import {
  changeInput,
  connectionsFetch,
  contentTypeCreate,
  contentTypeEdit,
  contentTypeFetch,
  contentTypeFetchSucceeded,
  resetDidFetchModelProp,
  setAttributeForm,
  setForm,
} from './actions';

import styles from './styles.scss';
import forms from './forms.json';

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
      this.setState({ showModal: true });

      // TODO refacto
      if (includes(this.props.hash, 'contentType')) {
        // Get the formType within the hash
        this.props.setForm(this.props.hash);

        // Fetch Model is the user is editing contentType
        if (includes(this.props.hash, 'edit')) {
          const contentTypeName = replace(split(this.props.hash, '::')[0], '#edit', '');
          this.fetchModel(contentTypeName);
        }
      }
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.hash !== this.props.hash) {
      if (!isEmpty(nextProps.hash)) {
        this.setState({ showModal: true });

        // TODO refacto
        if (includes(nextProps.hash, 'contentType')) {

          this.props.setForm(nextProps.hash);

          if (includes(nextProps.hash, 'edit') && !nextProps.didFetchModel) {
            const contentTypeName = replace(split(nextProps.hash, '::')[0], '#edit', '');
            this.fetchModel(contentTypeName);
          }
        }

        if (includes(nextProps.hash, 'create') && includes(nextProps.hash, 'attribute')) {
          console.log('oeeeee');
          this.props.setAttributeForm(nextProps.hash);
        }

      } else {
        this.setState({ showModal: false });
      }

    }
  }

  testContentType = (contentTypeName, cbSuccess, successData, cbFail, failData) => {
    // Check if the content type is in the localStorage (not saved)
    // To prevent request error
    if (storeData.getIsModelTemporary() && get(storeData.getContentType(), 'name') === contentTypeName) {
      cbSuccess(successData);
    } else {
      cbFail(failData);
    }
  }

  fetchModel = (contentTypeName) => {
    this.testContentType(
      contentTypeName,
      this.props.contentTypeFetchSucceeded,
      { model: storeData.getContentType() },
      this.props.contentTypeFetch,
      contentTypeName
    );
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

  createContentType = (data) => {
    const oldMenu = !isEmpty(this.props.menuData) ? this.props.menuData[0].items : [];

    // Check if link already exist in the menu to remove it
    const index = findIndex(oldMenu, [ 'name', replace(split(this.props.hash, '::')[0], '#edit', '')]);

    // Insert at a specific position or before the add button the not saved contentType
    const position = index !== -1 ? index  : size(oldMenu) - 1;

    oldMenu.splice(position, index !== -1 ? 1 : 0, { icon: 'fa-cube', fields: 0, description: data.description, name: data.name, isTemporary: true });

    const newMenu = oldMenu;

    // Store the temporary contentType in the localStorage
    this.props.contentTypeCreate(data);

    // Store new menu in localStorage and update App leftMenu
    this.props.storeTemporaryMenu(newMenu, position, index !== -1 ? 1 : 0);

    router.push(`${this.props.redirectRoute}/${data.name}`);
  }

  handleSubmit = () => {
    if (includes(this.props.hash, 'edit')) {
      this.testContentType(
        replace(split(this.props.hash, '::')[0], '#edit', ''),
        this.createContentType,
        this.props.modifiedDataEdit,
        this.props.contentTypeEdit,
      );
    } else {
      this.createContentType(this.props.modifiedData);
    }
  }

  generatePopUpTitle = (popUpFormType) => {
    let popUpTitle;
    const type = split(this.props.hash, '::')[0];
    switch (true) {
      case includes(type, 'create') && popUpFormType === 'contentType':
        popUpTitle = `popUpForm.create.${popUpFormType}.header.title`;
        break;
      case includes(type, 'choose'):
        popUpTitle = `popUpForm.choose.${popUpFormType}.header.title`;
        break;
      case includes(type, 'edit') && popUpFormType === 'contentType':
        popUpTitle = `popUpForm.edit.${popUpFormType}.header.title`;
        break;
      default:
        popUpTitle = 'popUpForm.doing';
    }

    return popUpTitle;
  }

  goToAttributeTypeView = (attributeType) => {
    const attributesSize = size(this.props.modifiedDataEdit.attributes);
    router.push(`${this.props.routePath}#create::attribute${attributeType}::baseSettings::${attributesSize}`);
  }

  toggle = () => {
    this.props.toggle();

    // Set the didFetchModel props to false when the modal is closing so the store is emptied
    // Only for editing
    if (this.state.showModal && includes(this.props.hash, 'edit')) {
      this.props.resetDidFetchModelProp();
    }
  }

  renderModalBodyChooseAttributes = () => (
    map(forms.attributesDisplay.items, (attribute, key) => (
      <AttributeCard
        key={key}
        attribute={attribute}
        routePath={this.props.routePath}
        handleClick={this.goToAttributeTypeView}
      />
    ))
  )

  render() {
    // Ensure typeof(popUpFormType) is String
    const popUpFormType = split(this.props.hash, '::')[1] || '';
    const popUpTitle = this.generatePopUpTitle(popUpFormType);
    console.log(this.props);
    // Two kinds of values are available modifiedData and modifiedDataEdit
    // Allows the user to start creating a contentType and modifying an existing one at the same time
    const values = includes(this.props.hash, 'edit') ? this.props.modifiedDataEdit : this.props.modifiedData;
    const noNav = includes(this.props.hash, 'choose');
    // Override the default rendering
    const renderModalBody = includes(this.props.hash, '#choose') ? this.renderModalBodyChooseAttributes : false;
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
          noNav={noNav}
          renderModalBody={renderModalBody}
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
      contentTypeCreate,
      contentTypeEdit,
      contentTypeFetch,
      contentTypeFetchSucceeded,
      resetDidFetchModelProp,
      setAttributeForm,
      setForm,
      storeTemporaryMenu,
    },
    dispatch
  );
}

Form.propTypes = {
  changeInput: React.PropTypes.func.isRequired,
  connectionsFetch: React.PropTypes.func.isRequired,
  contentTypeCreate: React.PropTypes.func,
  contentTypeEdit: React.PropTypes.func,
  contentTypeFetch: React.PropTypes.func,
  contentTypeFetchSucceeded: React.PropTypes.func,
  form: React.PropTypes.oneOfType([
    React.PropTypes.array.isRequired,
    React.PropTypes.object.isRequired,
  ]),
  hash: React.PropTypes.string.isRequired,
  menuData: React.PropTypes.array.isRequired,
  modifiedData: React.PropTypes.object,
  modifiedDataEdit: React.PropTypes.object,
  // noNav: React.PropTypes.bool,
  popUpHeaderNavLinks: React.PropTypes.array,
  redirectRoute: React.PropTypes.string.isRequired,
  resetDidFetchModelProp: React.PropTypes.func,
  routePath: React.PropTypes.string,
  selectOptions: React.PropTypes.array,
  selectOptionsFetchSucceeded: React.PropTypes.bool,
  setAttributeForm: React.PropTypes.func,
  setForm: React.PropTypes.func.isRequired,
  storeTemporaryMenu: React.PropTypes.func,
  toggle: React.PropTypes.func.isRequired,
};

export default connect(mapStateToProps, mapDispatchToProps)(Form);
