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
  compact,
  concat,
  findIndex,
  filter,
  get,
  has,
  includes,
  isEmpty,
  isObject,
  isUndefined,
  map,
  size,
  split,
  take,
  toNumber,
  replace,
} from 'lodash';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import moment from 'moment';
import { router } from 'app';

import { temporaryContentTypeFieldsUpdated, storeTemporaryMenu } from 'containers/App/actions';
import { addAttributeToContentType, addAttributeRelationToContentType, editContentTypeAttribute, editContentTypeAttributeRelation, updateContentType } from 'containers/ModelPage/actions';

import AttributeCard from 'components/AttributeCard';
import InputCheckboxWithNestedInputs from 'components/InputCheckboxWithNestedInputs';
import PopUpForm from 'components/PopUpForm';
import PopUpRelations from 'components/PopUpRelations';

// Utils
import { checkFormValidity } from '../../utils/formValidations';
import { storeData } from '../../utils/storeData';

import checkAttributeValidations from './utils/attributeValidations';
import setParallelAttribute, { setTempAttribute } from './utils/setAttribute';
import {
  changeInput,
  changeInputAttribute,
  connectionsFetch,
  contentTypeCreate,
  contentTypeEdit,
  contentTypeFetch,
  contentTypeFetchSucceeded,
  removeContentTypeRequiredError,
  resetFormErrors,
  resetIsFormSet,
  setAttributeForm,
  setAttributeFormEdit,
  setForm,
  setFormErrors,
} from './actions';
import selectForm from './selectors';

import styles from './styles.scss';
import forms from './forms.json';

/* eslint-disable react/sort-comp */
/* eslint-disable consistent-return */
/* eslint-disable react/jsx-wrap-multilines */

export class Form extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.state = {
      showModal: false,
      popUpTitleEdit: '',
      nodeToFocus: 0,
    };

    this.checkAttributeValidations = checkAttributeValidations.bind(this);
    this.setParallelAttribute = setParallelAttribute.bind(this);
    this.setTempAttribute = setTempAttribute.bind(this);
  }

  componentDidMount() {
    // Get available db connections
    this.props.connectionsFetch();
    this.initComponent(this.props, true);
    document.addEventListener('keydown', this.handleKeyBinding);
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

  componentWillUnmount() {
    document.removeEventListener('keyup', this.handleKeyBinding);
  }

  addAttributeToContentType = (redirectToChoose = false) => {
    const formErrors = this.checkAttributeValidations(checkFormValidity(this.props.modifiedDataAttribute, this.props.formValidations));

    if (!isEmpty(formErrors)) {
      return this.props.setFormErrors(formErrors);
    }

    // Check if user is adding a relation with the same content type

    if (includes(this.props.hash, 'attributerelation') && this.props.modifiedDataAttribute.params.target === this.props.modelName && get(this.props.modifiedDataAttribute, ['params', 'nature'], '') !== 'oneWay') {
      // Insert two attributes
      this.props.addAttributeRelationToContentType(this.props.modifiedDataAttribute);
    } else {
      // Update the parent container (ModelPage)
      this.props.addAttributeToContentType(this.props.modifiedDataAttribute);
    }
    // Empty the store
    this.props.resetIsFormSet();
    // Empty errors
    this.props.resetFormErrors();
    this.redirectAfterSave(redirectToChoose);
  }

  addAttributeToTempContentType = (redirectToChoose = false) => {
    const formErrors = this.checkAttributeValidations(checkFormValidity(this.props.modifiedDataAttribute, this.props.formValidations));

    if (!isEmpty(formErrors)) {
      return this.props.setFormErrors(formErrors);
    }

    // Get the entire content type from the reducer
    const contentType = this.props.modifiedDataEdit;
    // Add the new attribute to the content type attribute list
    const newAttribute = this.setTempAttribute();
    const parallelAttribute = this.props.modelName === get(newAttribute, ['params', 'target']) && get(newAttribute, ['params', 'nature'], '') === 'oneWay' ? null : this.setParallelAttribute(newAttribute);
    contentType.attributes = compact(concat(contentType.attributes, newAttribute, parallelAttribute));
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
    this.props.resetFormErrors();
    this.redirectAfterSave(redirectToChoose);
  }

  createContentType = (data) => {
    // Check form errors
    const formErrors = checkFormValidity(data, this.props.formValidations);
    // Check if content type name already exists
    const sameContentTypeNames = filter(this.props.menuData[0].items, (contentType) => contentType.name === data.name);

    if (size(sameContentTypeNames) > 0 && (includes(this.props.hash, '#create') || data.name !== replace(split(this.props.hash, '::')[0], '#edit', ''))) {
      formErrors.push({ name: 'name', errors: [{ id: 'content-type-builder.error.contentTypeName.taken' }]});
    }

    if (!isEmpty(formErrors)) {
      return this.props.setFormErrors(formErrors);
    }
    const oldMenu = !isEmpty(this.props.menuData) ? this.props.menuData[0].items : [];
    // Check if link already exist in the menu to remove it
    const index = findIndex(oldMenu, [ 'name', replace(split(this.props.hash, '::')[0], '#edit', '')]);
    // Insert at a specific position or before the add button the not saved contentType
    const position = index !== -1 ? index  : size(oldMenu) - 1;
    oldMenu.splice(position, index !== -1 ? 1 : 0, { icon: 'fa-cube', fields: 0, description: data.description, name: data.name, isTemporary: true });
    const newMenu = oldMenu;
    const contentType = data;

    map(contentType.attributes, (attr, key) => {
      if (get(attr.params, 'target') === this.props.modelName) {
        contentType.attributes[key].params.target = data.name;
      }
    });
    // Store the temporary contentType in the localStorage
    this.props.contentTypeCreate(contentType);
    // Store new menu in localStorage and update App leftMenu
    this.props.storeTemporaryMenu(newMenu, position, index !== -1 ? 1 : 0);
    // Reset popUp form
    this.props.resetIsFormSet();
    // Reset formErrors
    this.props.resetFormErrors();
    // Close modal
    const modelPage = includes(this.props.redirectRoute, 'models') ? '' : '/models';
    router.push(`${this.props.redirectRoute}${modelPage}/${data.name}`);
  }

  checkForNestedInput = (item) => {
    const hasNestedInput = item.items && item.type !== 'select';
    return hasNestedInput;
  }

  checkInputContentType = (item) => {
    const shouldOverrideHandleBlur = item.name === 'name' && includes(this.props.hash, 'contentType');
    return shouldOverrideHandleBlur;
  }

  // Function used when modified the name of the content type and not the attributes
  // Fires Form sagas
  contentTypeEdit = () => {
    const formErrors = checkFormValidity(this.props.modifiedDataEdit, this.props.formValidations);
    const sameContentTypeNames = filter(this.props.menuData[0].items, (contentType) => contentType.name === this.props.modifiedDataEdit.name);


    if (size(sameContentTypeNames) > 0 && this.props.modifiedDataEdit.name !== replace(split(this.props.hash, '::')[0], '#edit', '')) {
    // if (size(sameContentTypeNames) > 0 && this.props.modifiedDataEdit.name !== this.props.modelName) {
      formErrors.push({ name: 'name', errors: [{ id: 'content-type-builder.error.contentTypeName.taken' }]});
    }

    if (!isEmpty(formErrors)) {
      return this.props.setFormErrors(formErrors);
    }

    const contentType = storeData.getContentType();

    // Update relation key of the temporary contentType
    if (contentType) {
      map(contentType.attributes, (attr, key) => {
        if (get(attr.params, 'target') === replace(split(this.props.hash, '::')[0], '#edit', '')) {
          contentType.attributes[key].params.target = this.props.modifiedDataEdit.name;
        }
      });
      this.props.contentTypeCreate(contentType);
    }

    this.setState({ showModal: false });
    return this.props.contentTypeEdit(this.context);
  }

  editContentTypeAttribute = (redirectTochoose = false) => {
    const formErrors = this.checkAttributeValidations(checkFormValidity(this.props.modifiedDataAttribute, this.props.formValidations));
    const hashArray = split(this.props.hash, '::');

    if (!isEmpty(formErrors)) {
      return this.props.setFormErrors(formErrors);
    }

    if (!isUndefined(hashArray[4])) {
      // Update the parent container (ModelPage)
      this.props.editContentTypeAttributeRelation(this.props.modifiedDataAttribute, hashArray[3], hashArray[4], this.props.modifiedDataAttribute.params.target !== this.props.modelName);
    } else {
      this.props.editContentTypeAttribute(this.props.modifiedDataAttribute, hashArray[3], this.props.modifiedDataAttribute.params.target === this.props.modelName);
    }
    // Empty the store
    this.props.resetIsFormSet();
    // Empty errors
    this.props.resetFormErrors();
    this.redirectAfterSave(redirectTochoose);
  }

  editTempContentTypeAttribute = (redirectToChoose = false) => {
    const formErrors = this.checkAttributeValidations(checkFormValidity(this.props.modifiedDataAttribute, this.props.formValidations));

    if (!isEmpty(formErrors)) {
      return this.props.setFormErrors(formErrors);
    }

    const contentType = storeData.getContentType();
    const newAttribute = this.setTempAttribute();
    const oldAttribute = contentType.attributes[this.props.hash.split('::')[3]];
    contentType.attributes[this.props.hash.split('::')[3]] = newAttribute;

    if (newAttribute.params.target === this.props.modelName) {
      const parallelAttribute = this.setParallelAttribute(newAttribute);
      contentType.attributes[findIndex(contentType.attributes, ['name', oldAttribute.params.key])] = parallelAttribute;
    }

    if (oldAttribute.params.target === this.props.modelName && newAttribute.params.target !== this.props.modelName) {
      contentType.attributes.splice(findIndex(contentType.attributes, ['name', oldAttribute.params.key]), 1);
    }

    this.editContentTypeAttribute(redirectToChoose);

    const newContentType = contentType;
    // Empty errors
    this.props.resetFormErrors();
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
    const isCreating = includes(type, 'create');

    switch (true) {
      case isCreating && popUpFormType === 'contentType':
        popUpTitle = `content-type-builder.popUpForm.create.${popUpFormType}.header.title`;
        break;
      case isCreating:
        popUpTitle = 'content-type-builder.popUpForm.create';
        break;
      case includes(type, 'choose'):
        popUpTitle = `content-type-builder.popUpForm.choose.${popUpFormType}.header.title`;
        break;
      case includes(type, 'edit') && popUpFormType === 'contentType':
        popUpTitle = `content-type-builder.popUpForm.edit.${popUpFormType}.header.title`;
        break;
      default:
        popUpTitle = 'content-type-builder.popUpForm.edit';
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
    const settings = attributeType === 'relation' ? 'defineRelation' : 'baseSettings';
    router.push(`${this.props.routePath}#create${this.props.modelName}::attribute${attributeType}::${settings}`);
  }

  handleBlur = ({ target }) => {
    if (target.name === 'name') {
      this.props.changeInput(target.name, camelCase(target.value), includes(this.props.hash, 'edit'));
      if (!isEmpty(target.value)) {
        // The input name for content type doesn't have the default handleBlur validation so we need to manually remove the error
        this.props.removeContentTypeRequiredError();
      }
    }
  }

  handleChange = ({ target }) => {
    let value = target.type === 'number' && target.value !== '' ? toNumber(target.value) : target.value;

    // Parse enumeration textarea to transform it into a array
    if (target.name === 'params.enumValue') {
      value = target.value.split(',');
    }

    if (isObject(target.value) && target.value._isAMomentObject === true) {
      value = moment(target.value, 'YYYY-MM-DD HH:mm:ss').format();
    }

    if (includes(this.props.hash.split('::')[1], 'attribute')) {
      this.props.changeInputAttribute(target.name, value);

      if (target.name === 'params.nature' && target.value === 'manyToMany') {
        this.props.changeInputAttribute('params.dominant', true);
      }

      if (target.name === 'params.nature' && target.value === 'oneWay') {
        this.props.changeInputAttribute('params.key', '-');
      }

    } else {
      this.props.changeInput(target.name, value, includes(this.props.hash, 'edit'));
    }
  }

  handleKeyBinding = (e) => {
    if (includes(this.props.hash, 'choose')) {
      const { nodeToFocus } = this.state;
      let toAdd = 0;

      switch(e.keyCode) {
        case 37: // Left arrow
        case 39: // Right arrow
          toAdd = nodeToFocus % 2 === 0 ? 1 : -1;
          break;
        case 38:
          if (nodeToFocus === 0 || nodeToFocus === 1) {
            toAdd = 8;
          } else {
            toAdd = -2;
          }
          break;
        case 40:
          if (nodeToFocus === forms.attributesDisplay.items.length - 1 || nodeToFocus === forms.attributesDisplay.items.length - 2) {
            toAdd = -8;
          } else {
            toAdd = 2;
          }
          break;
        case 9: // Tab
          e.preventDefault();
          toAdd = nodeToFocus === 9 ? -9 : 1;
          break;
        default:
          toAdd = 0;
          break;
      }

      this.setState(prevState => ({ nodeToFocus: prevState.nodeToFocus + toAdd }));
    }
  }

  handleSubmit = (e, redirectToChoose = true) => {
    e.preventDefault();
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
        cbSuccess = isAttribute ? () => this.editTempContentTypeAttribute(redirectToChoose) : this.createContentType;
        dataSucces = isAttribute ? null : this.getModelWithCamelCaseName(this.props.modifiedDataEdit);
        cbFail = isAttribute ? () => this.editContentTypeAttribute(redirectToChoose) : this.contentTypeEdit;
        return this.testContentType(contentTypeName, cbSuccess, dataSucces, cbFail);
      }
      case includes(hashArray[0], 'create') && includes(this.props.hash.split('::')[1], 'attribute'): {
        cbSuccess = () => this.addAttributeToTempContentType(redirectToChoose);
        cbFail = () => this.addAttributeToContentType(redirectToChoose);
        return this.testContentType(contentTypeName, cbSuccess, dataSucces, cbFail);
      }
      default: {
        return this.createContentType(
          this.getModelWithCamelCaseName(this.props.modifiedData)
        );
      }
    }
  }

  getModelWithCamelCaseName = (model = {}) => {
    if (isEmpty(model) || isEmpty(model.name)) {
      return;
    }

    return {
      ...model,
      name: camelCase(model.name),
    };
  }

  initComponent = (props, condition) => {
    if (!isEmpty(props.hash)) {
      this.setState({ showModal: true });
      const valueToReplace = includes(props.hash, '#create') ? '#create' : '#edit';
      const contentTypeName = replace(split(props.hash, '::')[0], valueToReplace, '');
      const isPopUpAttribute = includes(props.hash, 'attribute');
      const isCreating = valueToReplace === '#create';

      if (condition && !isEmpty(contentTypeName) && contentTypeName !== '#choose') {
        this.fetchModel(contentTypeName);
      }

      switch (true) {
        case isPopUpAttribute && contentTypeName !== '#choose': {
          if (isCreating) {
            this.props.setAttributeForm(props.hash);
          } else if (get(props.contentTypeData, 'name')) {
            this.setState({ popUpTitleEdit: get(props.contentTypeData, ['attributes', split(props.hash, '::')[3], 'name']) });
            this.props.setAttributeFormEdit(props.hash, props.contentTypeData);
          }
          break;
        }
        case includes(props.hash, 'contentType'):
          this.props.setForm(props.hash);
          break;
        default:
      }
    } else {
      this.setState({ showModal: false });
    }
  }

  renderModalBodyChooseAttributes = () => {
    const attributesDisplay = has(this.context.plugins.toJS(), 'upload')
      ? forms.attributesDisplay.items
      : forms.attributesDisplay.items.filter(obj => obj.type !== 'media'); // Don't display the media field if the upload plugin isn't installed

    return (
      map(attributesDisplay, (attribute, key) => (
        <AttributeCard
          key={key}
          attribute={attribute}
          autoFocus={key === 0}
          routePath={this.props.routePath}
          handleClick={this.goToAttributeTypeView}
          nodeToFocus={this.state.nodeToFocus}
          tabIndex={key}
          resetNodeToFocus={this.resetNodeToFocus}
        />
      ))
    );
  }

  redirectAfterSave = (shouldOpenAttributesModal = false) => {
    const { modelName, redirectRoute } = this.props;
    const path = shouldOpenAttributesModal ? '#choose::attributes' : '';

    router.push(`${redirectRoute}/${modelName}${path}`);
  }

  resetNodeToFocus = () => this.setState({ nodeToFocus: 0 });

  testContentType = (contentTypeName, cbSuccess, successData, cbFail, failData) => {
    // Check if the content type is in the localStorage (not saved) to prevent request error
    if (storeData.getIsModelTemporary() && get(storeData.getContentType(), 'name') === contentTypeName) {
      cbSuccess(successData);
    } else {
      cbFail(failData);
    }
  }

  toggle = () => {
    this.props.toggle();
    // Set the isFormSet props to false when the modal is closing so the store is emptied
    this.props.resetIsFormSet();
    this.props.resetFormErrors();
  }

  overrideCustomBootstrapClass = () => {
    return includes(this.props.hash, 'attributenumber');
  }

  renderInput = (item, key) => (
    <InputCheckboxWithNestedInputs
      key={key}
      data={item}
      value={this.props.modifiedDataAttribute.params}
      onChange={this.handleChange}
      errors={this.props.formErrors}
      didCheckErrors={this.props.didCheckErrors}
    />
  )

  renderCustomPopUpHeader = (startTitle) => {
    const italicText = !includes(this.props.hash, '#edit') ?
      <FormattedMessage id='popUpForm.header' defaultMessage='{title}' values={{ title: replace(split(this.props.hash, ('::'))[1], 'attribute', '') }}>
        {(message) => <span style={{ fontStyle: 'italic', textTransform: 'capitalize' }}>{message}</span>}
      </FormattedMessage>
      : <span style={{ fontStyle: 'italic', textTransform: 'capitalize' }}>{this.state.popUpTitleEdit}</span>;
    return (
      <div>
        <FormattedMessage id={startTitle} />
        &nbsp;
        {italicText}
        &nbsp;
        <FormattedMessage id="content-type-builder.popUpForm.field" />
      </div>
    );
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
    const dropDownItems = take(get(this.props.menuData, ['0', 'items']), size(get(this.props.menuData[0], 'items')) - 1);
    const edit = includes(this.props.hash, '#edit');
    const selectOptions = includes(this.props.hash, 'attributenumber') ? get(this.props.form, ['items', '1', 'items']) : this.props.selectOptions;

    if (includes(popUpFormType, 'relation')) {
      const contentType = this.props.modelName.split('&source=');
      const contentTypeIndex = contentType.length === 2 ? { name: contentType[0], source: contentType[1] } : { name: contentType[0] };

      return (
        <PopUpRelations
          isOpen={this.state.showModal}
          toggle={this.toggle}
          renderCustomPopUpHeader={renderCustomPopUpHeader}
          popUpTitle={popUpTitle}
          routePath={`${this.props.routePath}/${this.props.hash}`}
          contentType={get(dropDownItems, [findIndex(dropDownItems, contentTypeIndex)])}
          form={this.props.form}
          showRelation={includes(this.props.hash, 'defineRelation')}
          onChange={this.handleChange}
          values={this.props.modifiedDataAttribute}
          dropDownItems={dropDownItems}
          onSubmit={this.handleSubmit}
          formErrors={this.props.formErrors}
          didCheckErrors={this.props.didCheckErrors}
          isEditting={edit}
          resetFormErrors={this.props.resetFormErrors}
        />
      );
    }

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
          selectOptions={selectOptions}
          onChange={this.handleChange}
          onBlur={this.handleBlur}
          onSubmit={this.handleSubmit}
          noNav={noNav}
          renderModalBody={renderModalBody}
          noButtons={noButtons}
          overrideRenderInputCondition={this.checkForNestedInput}
          overrideRenderInput={this.renderInput}
          buttonSubmitMessage={buttonSubmitMessage}
          showLoader={this.props.showButtonLoading}
          renderCustomPopUpHeader={renderCustomPopUpHeader}
          overrideHandleBlurCondition={this.checkInputContentType}
          formErrors={this.props.formErrors}
          didCheckErrors={this.props.didCheckErrors}
          pluginID="content-type-builder"
          overrideCustomBootstrapClass={includes(this.props.hash, 'attributenumber') && includes(this.props.hash, 'baseSettings')}
          customBootstrapClass='col-md-6'
        />
      </div>
    );
  }
}

Form.contextTypes = {
  plugins: PropTypes.object,
  updatePlugin: PropTypes.func,
};

const mapStateToProps = selectForm();

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      addAttributeRelationToContentType,
      addAttributeToContentType,
      editContentTypeAttribute,
      editContentTypeAttributeRelation,
      changeInput,
      changeInputAttribute,
      connectionsFetch,
      contentTypeCreate,
      contentTypeEdit,
      contentTypeFetch,
      contentTypeFetchSucceeded,
      removeContentTypeRequiredError,
      resetFormErrors,
      resetIsFormSet,
      setAttributeForm,
      setAttributeFormEdit,
      setForm,
      setFormErrors,
      storeTemporaryMenu,
      temporaryContentTypeFieldsUpdated,
      updateContentType,
    },
    dispatch
  );
}

Form.propTypes = {
  addAttributeRelationToContentType: PropTypes.func.isRequired,
  addAttributeToContentType: PropTypes.func.isRequired,
  changeInput: PropTypes.func.isRequired,
  changeInputAttribute: PropTypes.func.isRequired,
  connectionsFetch: PropTypes.func.isRequired,
  contentTypeCreate: PropTypes.func.isRequired,
  contentTypeEdit: PropTypes.func.isRequired,
  contentTypeFetch: PropTypes.func.isRequired,
  contentTypeFetchSucceeded: PropTypes.func.isRequired,
  didCheckErrors: PropTypes.bool.isRequired,
  editContentTypeAttribute: PropTypes.func.isRequired,
  editContentTypeAttributeRelation: PropTypes.func.isRequired,
  form: PropTypes.oneOfType([
    PropTypes.array.isRequired,
    PropTypes.object.isRequired,
  ]).isRequired,
  formErrors: PropTypes.array.isRequired,
  formValidations: PropTypes.array.isRequired,
  hash: PropTypes.string.isRequired,
  isFormSet: PropTypes.bool.isRequired,
  isModelPage: PropTypes.bool,
  menuData: PropTypes.array.isRequired,
  modelLoading: PropTypes.bool, // eslint-disable-line react/require-default-props
  modelName: PropTypes.string,
  modifiedData: PropTypes.object.isRequired,
  modifiedDataAttribute: PropTypes.object.isRequired,
  modifiedDataEdit: PropTypes.object.isRequired,
  popUpHeaderNavLinks: PropTypes.array.isRequired,
  redirectRoute: PropTypes.string.isRequired,
  removeContentTypeRequiredError: PropTypes.func.isRequired,
  resetFormErrors: PropTypes.func.isRequired,
  resetIsFormSet: PropTypes.func.isRequired,
  routePath: PropTypes.string.isRequired,
  selectOptions: PropTypes.array.isRequired,
  setAttributeForm: PropTypes.func.isRequired,
  setAttributeFormEdit: PropTypes.func.isRequired,
  setForm: PropTypes.func.isRequired,
  setFormErrors: PropTypes.func.isRequired,
  shouldRefetchContentType: PropTypes.bool.isRequired,
  showButtonLoading: PropTypes.bool.isRequired,
  storeTemporaryMenu: PropTypes.func.isRequired,
  temporaryContentTypeFieldsUpdated: PropTypes.func.isRequired,
  toggle: PropTypes.func.isRequired,
  updateContentType: PropTypes.func.isRequired,
};

Form.defaultProps = {
  isModelPage: false,
  modelName: '',
};

const withConnect = connect(mapStateToProps, mapDispatchToProps);

export default withConnect(Form);
