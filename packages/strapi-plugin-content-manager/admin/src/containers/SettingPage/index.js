/**
 * 
 * SettingPage
 */

import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { createStructuredSelector } from 'reselect';
import { findIndex, get, upperFirst } from 'lodash';
import cn from 'classnames';
import HTML5Backend from 'react-dnd-html5-backend';
import { DragDropContext } from 'react-dnd';
import { FormattedMessage } from 'react-intl';
import { ButtonDropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';

import PropTypes from 'prop-types';

import {
  moveAttr,
  moveAttrEditView,
  onChangeSettings,
  onClickAddAttr,
  onRemove,
  onRemoveEditViewAttr,
  onReset,
  onSubmit,
} from 'containers/App/actions';
import { makeSelectModifiedSchema , makeSelectSubmitSuccess } from 'containers/App/selectors';

import BackHeader from 'components/BackHeader';
import Input from 'components/InputsIndex';
import PluginHeader from 'components/PluginHeader';
import PopUpWarning from 'components/PopUpWarning';

import Block from 'components/Block';
import DraggableAttr from 'components/DraggableAttr';

import injectReducer from 'utils/injectReducer';
import injectSaga from 'utils/injectSaga';
import { onClickEditListItem } from './actions';

import forms from './forms.json';
import reducer from './reducer';
import saga from './saga';
import makeSelectSettingPage from './selectors';
import styles from './styles.scss';


class SettingPage extends React.PureComponent {
  state = {
    isDraggingSibling: false,
    isOpen: false,
    isOpenRelation: false,
    showWarning: false,
    showWarningCancel: false,
  };

  componentDidMount() {
    this.handleClickEditAttr(0);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.submitSuccess !== this.props.submitSuccess) {
      this.toggle();
    }
  }

  componentWillUnmount() {
    // Reset the modified data
    this.props.onReset();
  }

  getDefaultSort = () => this.getValue(`${this.getPath()}.defaultSort`, 'string');

  getDropDownItems = () => {
    const name = get(this.props.schema, `models.${this.getPath()}.primaryKey`, 'id' );
    // The id attribute is not present on schema so we need to add it manually
    const defaultAttr = { [name]: { name, label: 'Id', type: 'string', searchable: true, sortable: true } };
    const attributes = Object.assign(get(this.props.schema, `models.${this.getPath()}.attributes`, {}), defaultAttr);

    return Object.keys(attributes)
      .filter(attr => {
        return findIndex(this.getListDisplay(), ['name', attr]) === -1 && !attributes[attr].hasOwnProperty('collection') && !attributes[attr].hasOwnProperty('model');
      })
      .map(attr => {
        const searchable = attributes[attr].type !== 'json' && attributes[attr].type !== 'array';
        const obj = Object.assign(attributes[attr], { name: attr, label: upperFirst(attr), searchable, sortable: searchable });

        return obj;
      });
  }

  getDropDownRelationsItems = () => {
    const currentDisplayedRelations = this.getEditPageDisplayedRelations();

    return this.getRelations()
      .filter(relation => {
        return currentDisplayedRelations.indexOf(relation) === -1;
      });
  }

  getEditPageDisplaySettings = () => {
    return get(this.props.schema, 'models.'.concat(this.getPath().concat('.editDisplay')), { fields: [], relations: [] });
  }
  
  getEditPageFields = () => get(this.getEditPageDisplaySettings(), ['fields'], []);
  
  getEditPageDisplayedRelations = () => get(this.getEditPageDisplaySettings(), ['relations'], []);

  getListDisplay = () => (
    get(this.props.schema, `models.${this.getPath()}.listDisplay`, [])
  );

  getModelName = () => {
    const { match: { params: { slug, endPoint } } } = this.props;

    return endPoint || slug;
  }

  getPath = () => {
    const { match: { params: { slug, source, endPoint } } } = this.props;

    return [slug, source, endPoint]
      .filter(param => param !== undefined)
      .join('.');
  }

  getRelations = () => {
    const relations = get(this.props.schema, 'models.'.concat(this.getPath()).concat('.relations'), {});
    
    return Object.keys(relations)
      .filter(relation => {
        const isUploadRelation = get(relations, [relation, 'plugin'], '') === 'upload';
        const isMorphSide = get(relations, [relation, 'nature'], '').toLowerCase().includes('morph') && get(relations, [relation, relation]) !== undefined;

        return !isUploadRelation && !isMorphSide;
      });
  }

  getSelectOptions = (input) => {
    const selectOptions = this.getListDisplay().reduce((acc, curr) => {

      if (curr.sortable === true) {
        return acc.concat([curr.name]);
      }

      return acc;
    }, []);

    if (selectOptions.length === 0) {
      selectOptions.push(this.getPrimaryKey());
    }

    return input.name === 'defaultSort' ? selectOptions : input.selectOptions;
  }

  getPluginHeaderActions = () => (
    [
      {
        label: 'content-manager.popUpWarning.button.cancel',
        kind: 'secondary',
        onClick: this.handleReset,
        type: 'button',
      },
      {
        kind: 'primary',
        label: 'content-manager.containers.Edit.submit',
        onClick: this.handleSubmit,
        type: 'submit',
      },
    ]
  );

  getPrimaryKey = () => get(this.props.schema, ['models', this.getModelName()].concat(['primaryKey']), 'id');

  getValue = (keys, type) => {
    const value =  get(this.props.schema, ['models'].concat(keys.split('.')));

    return type === 'toggle' ? value : value.toString();
  }

  handleChange = (e) => {
    const defaultSort = this.getDefaultSort();
    const name = e.target.name.split('.');
    name.pop();
    const attrName = get(this.props.schema.models, name.concat(['name']));
    const isDisablingDefaultSort = attrName === defaultSort && e.target.value === false;

    if (isDisablingDefaultSort) {
      const enableAttrsSort = this.getSelectOptions({ name: 'defaultSort' }).filter(attr => attr !== attrName);
      
      if (enableAttrsSort.length === 0) {
        strapi.notification.info('content-manager.notification.info.SettingPage.disableSort');
      } else {
        const newDefaultSort = enableAttrsSort.length === 0 ? this.getPrimaryKey() : enableAttrsSort[0];
        const target = { name: `${this.getPath()}.defaultSort`, value: newDefaultSort };  
        this.props.onChangeSettings({ target });
        this.props.onChangeSettings(e);
      }
    } else {
      this.props.onChangeSettings(e);
    }
  }

  handleClickEditAttr = (index) => {
    const attrToEdit = get(this.props.schema, ['models'].concat(this.getPath().split('.')).concat(['listDisplay', index]), {});
    this.props.onClickEditListItem(attrToEdit);
  }

  handleConfirmReset = () => {
    this.props.onReset();
    this.toggleWarningCancel();
  }

  handleGoBack = () => this.props.history.goBack();

  handleRemove = (index, keys) => {
    const attrToRemove = get(this.getListDisplay(), index, {});
    const defaultSort = this.getDefaultSort();
    const isRemovingDefaultSort = defaultSort === attrToRemove.name;
    
    if (isRemovingDefaultSort) {
      const enableAttrsSort = this.getSelectOptions({ name: 'defaultSort' }).filter(attr => attr !== attrToRemove.name);
      const newDefaultSort = enableAttrsSort.length > 1 ? enableAttrsSort[0] : this.getPrimaryKey();
      const target = { name: `${this.getPath()}.defaultSort`, value: newDefaultSort };  
      this.props.onChangeSettings({ target });
    }

    this.props.onRemove(index, keys);
  }

  handleReset = (e) => {
    e.preventDefault();
    this.setState({ showWarningCancel: true });
  }

  handleSubmit = (e) => {
    e.preventDefault();
    this.setState({ showWarning: true });
  }

  findIndexListItemToEdit = () => {
    const index = findIndex(this.getListDisplay(), ['name', get(this.props.settingPage, ['listItemToEdit', 'name'])]);

    return index === -1 ? 0 : index;
  }

  hasRelations = () => {
    return this.getRelations().length > 0;
  }

  // We need to remove the Over state on the DraggableAttr component
  updateSiblingHoverState = () => {
    this.setState(prevState => ({ isDraggingSibling: !prevState.isDraggingSibling }));
  };

  toggle = () => this.setState(prevState => ({ showWarning: !prevState.showWarning }));

  toggleWarningCancel = () => this.setState(prevState => ({ showWarningCancel: !prevState.showWarningCancel }));
  
  toggleDropdown = () => {
    if (this.getDropDownItems().length > 0) {
      this.setState(prevState => ({ isOpen: !prevState.isOpen }));
    }
  }

  toggleDropdownRelations = () => {
    if (this.getDropDownRelationsItems().length > 0) {
      this.setState(prevState => ({ isOpenRelation: !prevState.isOpenRelation }));
    }
  }

  renderDraggableAttrEditSettingsRelation = (attr, index) => (
    <DraggableAttr
      index={index}
      isDraggingSibling={false}
      isEditing={false}
      key={attr}
      keys={`${this.getPath()}.editDisplay.relations`}
      name={attr}
      label={attr}
      moveAttr={this.props.moveAttrEditView}
      onClickEditListItem={() => {}}
      onRemove={this.props.onRemoveEditViewAttr}
      updateSiblingHoverState={() => {}}
    />
  );

  renderDraggableAttrListSettings = (attr, index) => (
    <div key={attr.name} className={styles.draggedWrapper}>
      <div>{index + 1}.</div>
      <DraggableAttr
        index={index}
        isDraggingSibling={this.state.isDraggingSibling}
        isEditing={index === this.findIndexListItemToEdit()}
        key={attr.name}
        keys={this.getPath()}
        label={attr.label}
        name={attr.name}
        moveAttr={this.props.moveAttr}
        onClickEditListItem={this.handleClickEditAttr}
        onRemove={this.handleRemove}
        updateSiblingHoverState={this.updateSiblingHoverState}
      />
    </div>
  );

  renderDropDownItemEditSettingsRelation = item => (
    <DropdownItem
      key={item}
      onClick={() => this.props.onClickAddAttr(item, `${this.getPath()}.editDisplay.relations`)}
    >
      {item}
    </DropdownItem>
  );

  renderDropDownItemListSettings = item => (
    <DropdownItem
      key={item.name}
      onClick={() => {
        this.props.onClickAddAttr(item, `${this.getPath()}.listDisplay`);
      }}
    >
      {item.label}
    </DropdownItem>
  );

  renderDropDownP = msg => <p>{msg}</p>;

  renderFormEditSettingsRelation = (input, i) => {
    return  (
      <Input
        key={i}
        onChange={() => {}}
        value=""
        {...input}
      />
    );
  }

  renderFormListAttrSettings = (input, i) => {
    const indexListItemToEdit = this.findIndexListItemToEdit();
    const inputName = `${this.getPath()}.listDisplay.${indexListItemToEdit}.${input.name}`;
    const inputType = this.getListDisplay()[indexListItemToEdit].type;


    if (indexListItemToEdit === -1) {
      return <div key={i} />;
    }

    if ((inputType === 'json' || inputType === 'array') && (input.name === 'sortable' || input.name === 'searchable')) {
      return null;
    }

    return (
      <Input
        key={input.name}
        onChange={this.handleChange}
        value={this.getValue(inputName, input.type)}
        {...input}
        name={inputName}
      />
    );
  }

  renderInputMainSettings = input => {
    const inputName = `${this.getPath()}.${input.name}`;
                    
    return (
      <Input
        {...input}
        key={input.name}
        name={inputName}
        onChange={this.props.onChangeSettings}
        selectOptions={this.getSelectOptions(input)}
        value={this.getValue(inputName, input.type)}
      />
    );
  }

  render() {
    const { isOpen, isOpenRelation, showWarning, showWarningCancel } = this.state;
    const {
      onSubmit,
    } = this.props;

    return (
      <form onSubmit={this.handleSubmit}>
        <BackHeader onClick={this.handleGoBack} />
        <div className={cn('container-fluid', styles.containerFluid)}>
          <PluginHeader
            actions={this.getPluginHeaderActions()}
            title={`Content Manager - ${upperFirst(this.getModelName())}`}
            description={{ id: 'content-manager.containers.SettingPage.pluginHeaderDescription' }}
          />
          <PopUpWarning
            isOpen={showWarning}
            toggleModal={this.toggle}
            content={{
              title: 'content-manager.popUpWarning.title',
              message: 'content-manager.popUpWarning.warning.updateAllSettings',
              cancel: 'content-manager.popUpWarning.button.cancel',
              confirm: 'content-manager.popUpWarning.button.confirm',
            }}
            popUpWarningType="danger"
            onConfirm={onSubmit}
          />
          <PopUpWarning
            isOpen={showWarningCancel}
            toggleModal={this.toggleWarningCancel}
            content={{
              title: 'content-manager.popUpWarning.title',
              message: 'content-manager.popUpWarning.warning.cancelAllSettings',
              cancel: 'content-manager.popUpWarning.button.cancel',
              confirm: 'content-manager.popUpWarning.button.confirm',
            }}
            popUpWarningType="danger"
            onConfirm={this.handleConfirmReset}
          />

          <div className={cn('row', styles.container)}>
            <Block
              description="content-manager.containers.SettingPage.listSettings.description"
              title="content-manager.containers.SettingPage.listSettings.title"
              style={{ marginBottom: '25px' }}
            >
              <div className={styles.ctmForm}>
                <div className="row">
                  {/* GENERAL LIST SETTINGS FORM */}
                  <div className="col-md-12">
                    <div className="row">
                      {forms.inputs.map(this.renderInputMainSettings)}
                    </div>
                  </div>

                  <div className="col-md-12">
                    <div className={styles.separator} />
                  </div>
                </div>

                <div className={styles.listDisplayWrapper}>
                  <div className="row">

                    <div className={cn('col-md-12', styles.draggedDescription)}>
                      <FormattedMessage id="content-manager.containers.SettingPage.attributes" />
                      <p>
                        <FormattedMessage id="content-manager.containers.SettingPage.attributes.description" />
                      </p>
                    </div>

                    <div className="col-md-5">
                      {this.getListDisplay().map(this.renderDraggableAttrListSettings)}
                      <div className={cn(styles.dropdownWrapper, isOpen && styles.dropdownWrapperOpen)}>
                        <ButtonDropdown isOpen={isOpen} toggle={this.toggleDropdown}>
                          <DropdownToggle>
                            <FormattedMessage id="content-manager.containers.SettingPage.addField">
                              {this.renderDropDownP}
                            </FormattedMessage>
                          </DropdownToggle>
                          <DropdownMenu>
                            {this.getDropDownItems().map(this.renderDropDownItemListSettings)}
                          </DropdownMenu>
                        </ButtonDropdown>
                      </div>
                    </div>

                    {/* LIST ATTR FORM */}
                    <div className="col-md-7">
                      <div className={styles.editWrapper}>
                        <div className="row">
                          {forms.editList.map(this.renderFormListAttrSettings)}
                        </div>
                      </div>
                    </div>
                    {/* LIST ATTR FORM */}
                  </div>
                </div>
              </div>
            </Block>

            <Block
              description="content-manager.containers.SettingPage.editSettings.description"
              title="content-manager.containers.SettingPage.editSettings.title"
            >
              <div className="row">
                <div className={cn('col-md-8', styles.draggedDescription, styles.edit_settings)}>
                  <FormattedMessage id="content-manager.containers.SettingPage.attributes" />
                  <div className={cn(styles.sort_wrapper, 'col-md-12')}>
                    <div className="row">
                      {/* GRID SORT */}
                    </div>
                  </div>
                </div>

                {/* RELATIONS SORT */}
                {this.hasRelations() && (
                  <div className={cn('col-md-4', styles.draggedDescription, styles.edit_settings)}>
                    <FormattedMessage id="content-manager.containers.SettingPage.relations" />
                    <div className={cn(styles.sort_wrapper, 'col-md-12')}>
                      <div className="row">
                        {/* DRAGGABLE BLOCK */}
                        {this.getEditPageDisplayedRelations().map(this.renderDraggableAttrEditSettingsRelation)}
                        {/* DRAGGABLE BLOCK */}
                        <div className={cn(styles.dropdownRelations, styles.dropdownWrapper, isOpenRelation && styles.dropdownWrapperOpen)}>
                          <ButtonDropdown isOpen={isOpenRelation} toggle={this.toggleDropdownRelations}>
                            <DropdownToggle>
                              <FormattedMessage id="content-manager.containers.SettingPage.addField">
                                {this.renderDropDownP}
                              </FormattedMessage>
                            </DropdownToggle>
                            <DropdownMenu>
                              {this.getDropDownRelationsItems().map(this.renderDropDownItemEditSettingsRelation)}
                            </DropdownMenu>
                          </ButtonDropdown>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* RELATIONS SORT */}
              </div>

              {/* EDIT MAIN ATTR FORM */}
              <div className="row">
                <div className="col-md-8">
                  <div className={styles.editWrapper}>

                    <div className="row">
                      {forms.editView.relationForm.map(this.renderFormEditSettingsRelation)}                    
                    </div>

                  </div>
                </div>
              </div>
              {/* EDIT MAIN ATTR FORM */}
            </Block>
          </div>
        </div>
      </form>
    );
  }
}

SettingPage.defaultProps = {};

SettingPage.propTypes = {
  history: PropTypes.object.isRequired,
  match: PropTypes.object.isRequired,
  moveAttr: PropTypes.func.isRequired,
  moveAttrEditView: PropTypes.func.isRequired,
  onChangeSettings: PropTypes.func.isRequired,
  onClickAddAttr: PropTypes.func.isRequired,
  onClickEditListItem: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onRemoveEditViewAttr: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  schema: PropTypes.object.isRequired,
  settingPage: PropTypes.object.isRequired,
  submitSuccess: PropTypes.bool.isRequired,
};

const mapDispatchToProps = (dispatch) => (
  bindActionCreators(
    {
      moveAttr,
      moveAttrEditView,
      onChangeSettings,
      onClickAddAttr,
      onClickEditListItem,
      onRemove,
      onRemoveEditViewAttr,
      onReset,
      onSubmit,
    },
    dispatch,
  )
);

const mapStateToProps = createStructuredSelector({
  schema: makeSelectModifiedSchema(),
  settingPage: makeSelectSettingPage(),
  submitSuccess: makeSelectSubmitSuccess(),
});

const withConnect = connect(mapStateToProps, mapDispatchToProps);
const withReducer = injectReducer({ key: 'settingPage', reducer });
const withSaga = injectSaga({ key: 'settingPage', saga });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(DragDropContext(HTML5Backend)(SettingPage));
