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
import { FormattedMessage } from 'react-intl';
import { router, store } from 'app';

import { temporaryContentTypeFieldsUpdated, storeTemporaryMenu } from 'containers/App/actions';
import { addAttributeToContentType, editContentTypeAttribute, updateContentType } from 'containers/ModelPage/actions';
import AttributeCard from 'components/AttributeCard';
import InputCheckboxWithNestedInputs from 'components/InputCheckboxWithNestedInputs';
import PopUpForm from 'components/PopUpForm';

import { getAsyncInjectors } from 'utils/asyncInjectors';

import { storeData } from '../../utils/storeData';

import reducer from './reducer';
import sagas from './sagas';
import selectForm from './selectors';
import {
  changeInput,
  changeInputAttribute,
  connectionsFetch,
  contentTypeCreate,
  contentTypeEdit,
  contentTypeFetch,
  contentTypeFetchSucceeded,
  resetIsFormSet,
  setAttributeForm,
  setAttributeFormEdit,
  setForm,
} from './actions';

import styles from './styles.scss';
import forms from './forms.json';

const { injectReducer, injectSagas } = getAsyncInjectors(store);
injectReducer('form', reducer);
injectSagas(sagas);

/* eslint-disable react/sort-comp */

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
    this.initComponent(this.props, true);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.hash !== this.props.hash) {
      this.initComponent(nextProps, !nextProps.isFormSet);
    }

    // Close modal when updating a content type && success updating
    if (nextProps.shouldRefetchContentType !== this.props.shouldRefetchContentType) {
      // Check if localStorage because the PluginLeftMenu is based on the localStorage
      if (storeData.getMenu()) {
        // Update localStorage
        const oldMenu = storeData.getMenu();
        const index = findIndex(oldMenu, ['name', replace(this.props.hash.split('::')[0], '#edit', '')]);
        const modifiedContentType = {
          name: this.props.modifiedDataEdit.name,
          icon: 'fa-caret-square-o-right',
        };

        oldMenu.splice(index, 1, modifiedContentType);
        const newMenu = oldMenu;
        storeData.setMenu(newMenu);
      }

      // Close Modal
      const redirectToModelPage = includes(this.props.redirectRoute, 'models') ? `/${this.props.modifiedDataEdit.name}` : '';
      router.push(`${this.props.redirectRoute}${redirectToModelPage}`);
      // Reset props
      this.props.resetIsFormSet();

      // Sagas are cancelled on location change so to update the content type description and collectionName we have to force it
      if (this.props.isModelPage) {
        this.props.updateContentType(this.props.modifiedDataEdit);
      }
    }
  }


  componentDidUpdate(prevProps) {
    if (prevProps.modelLoading !== this.props.modelLoading && !isEmpty(this.props.hash)) {
      this.initComponent(this.props, true);
    }
  }

  addAttributeToContentType = () => {
    // Update the parent container (ModelPage)
    this.props.addAttributeToContentType(this.props.modifiedDataAttribute);
    // Empty the store
    this.props.resetIsFormSet();
    // Close modal
    router.push(`${this.props.redirectRoute}/${replace(this.props.hash.split('::')[0], '#create', '')}`);
  }

  addAttributeToTempContentType = () => {
    // Get the entire content type from the reducer
    const contentType = this.props.modifiedDataEdit;
    // Add the new attribute to the content type attribute list
    contentType.attributes.push(this.props.modifiedDataAttribute);
    // Reset the store and update the parent container
    this.props.contentTypeCreate(contentType);
    // Get the displayed model from the localStorage
    const model = storeData.getModel();
    // Set the new field number in the localStorage
    model.fields = size(contentType.attributes);
    // Update the global store (app container) to add the new value to the model without refetching
    this.props.temporaryContentTypeFieldsUpdated(model.fields);
    // Store the updated model in the localStorage
    storeData.setModel(model);
    // Close modal
    router.push(`${this.props.redirectRoute}/${contentType.name}`);
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
    this.props.resetIsFormSet();
    // Close modal
    const modelPage = includes(this.props.redirectRoute, 'models') ? '' : '/models';
    router.push(`${this.props.redirectRoute}${modelPage}/${data.name}`);
  }

  editContentTypeAttribute = () => {
    // Update the parent container (ModelPage)
    this.props.editContentTypeAttribute(this.props.modifiedDataAttribute, this.props.hash.split('::')[3]);
    // Empty the store
    this.props.resetIsFormSet();
    // Close modal
    router.push(`${this.props.redirectRoute}/${replace(this.props.hash.split('::')[0], '#edit', '')}`);
  }

  editTempContentTypeAttribute = () => {
    this.editContentTypeAttribute();
    const contentType = storeData.getContentType();
    contentType.attributes[this.props.hash.split('::')[3]] = this.props.modifiedDataAttribute;
    const newContentType = contentType;
    storeData.setContentType(newContentType);
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
      case includes(type, 'create'):
        popUpTitle = 'popUpForm.create';
        break;
      default:
        popUpTitle = 'popUpForm.edit';
    }

    return popUpTitle;
  }

  getValues = () => {
    let values;
    // Three kinds of values are available modifiedData and modifiedDataEdit
    // Allows the user to start creating a contentType and modifying an existing one at the same time
    switch (true) {
      case includes(this.props.hash, 'edit') && !includes(this.props.hash, 'attribute'):
        values = this.props.modifiedDataEdit;
        break;
      case includes(this.props.hash.split('::')[1], 'attribute'):
        values = this.props.modifiedDataAttribute;
        break;
      default:
        values = this.props.modifiedData;
    }

    return values;
  }

  goToAttributeTypeView = (attributeType) => {
    router.push(`${this.props.routePath}#create${this.props.modelName}::attribute${attributeType}::baseSettings`);
  }

  handleBlur = ({ target }) => {
    if (target.name === 'name') {
      this.props.changeInput(target.name, camelCase(target.value), includes(this.props.hash, 'edit'));
    }
  }

  handleChange = ({ target }) => {
    const value = target.type === 'number' ? toNumber(target.value) : target.value;

    if (includes(this.props.hash.split('::')[1], 'attribute')) {
      this.props.changeInputAttribute(target.name, value);
    } else {
      this.props.changeInput(target.name, value, includes(this.props.hash, 'edit'));
    }
  }

  handleSubmit = () => {
    const hashArray = split(this.props.hash, ('::'));
    const valueToReplace = includes(this.props.hash, '#create') ? '#create' : '#edit';
    const contentTypeName = replace(hashArray[0], valueToReplace, '');

    let cbSuccess;
    let dataSucces = null;
    let cbFail;

    switch (true) {
      case includes(hashArray[0], '#edit'): {
        // Check if the user is editing the attribute
        const isAttribute = includes(hashArray[1], 'attribute');
        cbSuccess = isAttribute ? this.editTempContentTypeAttribute : this.createContentType;
        dataSucces = isAttribute ? null : this.props.modifiedDataEdit;
        cbFail = isAttribute ? this.editContentTypeAttribute : this.props.contentTypeEdit;
        return this.testContentType(contentTypeName, cbSuccess, dataSucces, cbFail);
      }
      case includes(hashArray[0], 'create') && includes(this.props.hash.split('::')[1], 'attribute'): {
        cbSuccess = this.addAttributeToTempContentType;
        cbFail = this.addAttributeToContentType;
        return this.testContentType(contentTypeName, cbSuccess, dataSucces, cbFail);
      }
      default:
        return this.createContentType(this.props.modifiedData);
    }
  }

  initComponent = (props, condition) => {
    if (!isEmpty(props.hash)) {
      this.setState({ showModal: true });

      const valueToReplace = includes(props.hash, '#create') ? '#create' : '#edit';
      const contentTypeName = replace(split(props.hash, '::')[0], valueToReplace, '');

      if (condition && !isEmpty(contentTypeName) && contentTypeName !== '#choose') {
        this.fetchModel(contentTypeName);
      }

      // TODO refacto
      if (includes(props.hash, 'contentType')) {
        this.props.setForm(props.hash);
      }

      if (includes(props.hash, '#create') && includes(props.hash, 'attribute')) {
        this.props.setAttributeForm(props.hash);
      }

      if (get(props.contentTypeData, 'name') && includes(props.hash, '#edit') && includes(props.hash, 'attribute')) {
        this.props.setAttributeFormEdit(props.hash, props.contentTypeData);
      }
    } else {
      this.setState({ showModal: false });
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

  testContentType = (contentTypeName, cbSuccess, successData, cbFail, failData) => {
    // Check if the content type is in the localStorage (not saved)
    // To prevent request error
    if (storeData.getIsModelTemporary() && get(storeData.getContentType(), 'name') === contentTypeName) {
      cbSuccess(successData);
    } else {
      cbFail(failData);
    }
  }

  toggle = () => {
    this.props.toggle();
    // Set the isFormSet props to false when the modal is closing so the store is emptied
    if (this.state.showModal) {
      this.props.resetIsFormSet();
    }
  }

  checkForNestedInput = (item) => {
    const hasNestedInput = item.items && item.type !== 'select';
    return hasNestedInput;
  }

  renderInput = (item, key) => (
    <InputCheckboxWithNestedInputs
      key={key}
      data={item}
      value={this.props.modifiedDataAttribute.params}
      handleChange={this.handleChange}
    />
  )

  renderCustomPopUpHeader = (startTitle) => {
    const italicText = replace(split(this.props.hash, ('::'))[1], 'attribute', '');
    return (
      <div>
        <FormattedMessage id={startTitle} />&nbsp;<FormattedMessage id={italicText}>
          {(message) => <span style={{ fontStyle: 'italic', textTransform: 'capitalize' }}>{message}</span>}
        </FormattedMessage>&nbsp;
        <FormattedMessage id="popUpForm.field" />
      </div>
    )
  }

  render() {
    // Ensure typeof(popUpFormType) is String
    const popUpFormType = split(this.props.hash, '::')[1] || '';
    const popUpTitle = this.generatePopUpTitle(popUpFormType);
    const values = this.getValues();
    const noNav = includes(this.props.hash, 'choose');
    // Override the default rendering
    const renderModalBody = includes(this.props.hash, '#choose') ? this.renderModalBodyChooseAttributes : false;
    // Hide the button in the modal
    const noButtons = includes(this.props.hash, '#choose');
    const buttonSubmitMessage = includes(this.props.hash.split('::')[1], 'contentType') ? 'form.button.save' : 'form.button.continue';
    const renderCustomPopUpHeader = !includes(this.props.hash, '#choose') && includes(this.props.hash, '::attribute') ? this.renderCustomPopUpHeader(popUpTitle) : false;

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
          noButtons={noButtons}
          overrideRenderInputCondition={this.checkForNestedInput}
          overrideRenderInput={this.renderInput}
          buttonSubmitMessage={buttonSubmitMessage}
          showLoader={this.props.showButtonLoading}
          renderCustomPopUpHeader={renderCustomPopUpHeader}
        />
      </div>
    );
  }
}

const mapStateToProps = selectForm();

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      addAttributeToContentType,
      editContentTypeAttribute,
      changeInput,
      changeInputAttribute,
      connectionsFetch,
      contentTypeCreate,
      contentTypeEdit,
      contentTypeFetch,
      contentTypeFetchSucceeded,
      resetIsFormSet,
      setAttributeForm,
      setAttributeFormEdit,
      setForm,
      storeTemporaryMenu,
      temporaryContentTypeFieldsUpdated,
      updateContentType,
    },
    dispatch
  );
}

Form.propTypes = {
  addAttributeToContentType: React.PropTypes.func,
  changeInput: React.PropTypes.func.isRequired,
  changeInputAttribute: React.PropTypes.func,
  connectionsFetch: React.PropTypes.func.isRequired,
  contentTypeCreate: React.PropTypes.func,
  contentTypeEdit: React.PropTypes.func,
  contentTypeFetch: React.PropTypes.func,
  contentTypeFetchSucceeded: React.PropTypes.func,
  editContentTypeAttribute: React.PropTypes.func,
  form: React.PropTypes.oneOfType([
    React.PropTypes.array.isRequired,
    React.PropTypes.object.isRequired,
  ]),
  hash: React.PropTypes.string.isRequired,
  isModelPage: React.PropTypes.bool,
  menuData: React.PropTypes.array.isRequired,
  modelLoading: React.PropTypes.bool,
  modelName: React.PropTypes.string,
  modifiedData: React.PropTypes.object,
  modifiedDataAttribute: React.PropTypes.object,
  modifiedDataEdit: React.PropTypes.object,
  // noNav: React.PropTypes.bool,
  popUpHeaderNavLinks: React.PropTypes.array,
  redirectRoute: React.PropTypes.string.isRequired,
  resetIsFormSet: React.PropTypes.func,
  routePath: React.PropTypes.string,
  selectOptions: React.PropTypes.array,
  selectOptionsFetchSucceeded: React.PropTypes.bool,
  setAttributeForm: React.PropTypes.func,
  setAttributeFormEdit: React.PropTypes.func,
  setForm: React.PropTypes.func.isRequired,
  shouldRefetchContentType: React.PropTypes.bool,
  showButtonLoading: React.PropTypes.bool,
  storeTemporaryMenu: React.PropTypes.func,
  temporaryContentTypeFieldsUpdated: React.PropTypes.func,
  toggle: React.PropTypes.func.isRequired,
  updateContentType: React.PropTypes.func,
};

export default connect(mapStateToProps, mapDispatchToProps)(Form);
