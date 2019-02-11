/**
 *
 * SettingPage
 */

import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { createStructuredSelector } from 'reselect';
import { findIndex, get, isEmpty, upperFirst } from 'lodash';
import cn from 'classnames';
import HTML5Backend from 'react-dnd-html5-backend';
import { DragDropContext } from 'react-dnd';
import { FormattedMessage } from 'react-intl';
import { ButtonDropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import PropTypes from 'prop-types';
import pluginId from 'pluginId';
import {
  beginMove,
  endMove,
  moveAttr,
  moveAttrEditView,
  moveVariableAttrEditView,
  onChangeInputType,
  onChangeSettings,
  onClickAddAttr,
  onClickAddAttrField,
  onRemove,
  onRemoveEditViewFieldAttr,
  onRemoveEditViewRelationAttr,
  onReset,
  onSubmit,
  setLayout,
} from 'containers/App/actions';
import {
  makeSelectAddedField,
  makeSelectDraggedItemName,
  makeSelectGrid,
  makeSelectHoverIndex,
  makeSelectInitDragLine,
  makeSelectModifiedSchema,
  makeSelectShouldResetGrid,
  makeSelectSubmitSuccess,
} from 'containers/App/selectors';

import BackHeader from 'components/BackHeader';
import Block from 'components/Block';
import CustomDragLayer from 'components/CustomDragLayer';
import DraggableAttr from 'components/DraggableAttr';
import FormTitle from 'components/FormTitle';
import HeaderNav from 'components/HeaderNav';
import Input from 'components/InputsIndex';
import InputSelect from 'components/InputSelect';
import PluginHeader from 'components/PluginHeader';
import PopUpWarning from 'components/PopUpWarning';
import VariableDraggableAttr from 'components/VariableDraggableAttr';

import { onClickEditField, onClickEditListItem, onClickEditRelation } from './actions';
import reducer from './reducer';
import saga from './saga';
import makeSelectSettingPage from './selectors';

import SectionTitle from './SectionTitle';

import forms from './forms.json';
import styles from './styles.scss';


class SettingPage extends React.PureComponent {
  state = {
    isDraggingSibling: false,
    isOpen: false,
    isOpenField: false,
    isOpenRelation: false,
    showWarning: false,
    showWarningCancel: false,
    shouldSelectField: false,
    shouldSelectRelation: false,
  };

  componentDidMount() {
    this.handleClickEditAttr(0);
    const fields = this.getEditPageDisplayedFields();
    const relations = this.getEditPageDisplayedRelations();
    this.props.setLayout(`${this.getPath()}.editDisplay`);

    if (fields.length > 0) {
      this.handleClickEditField(0);
    } else if (relations.length > 0) {
      this.handleClickEditRelation(0);
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const { schema } = prevProps;
    const prevDisplayedFields = get(
      schema,
      ['models', ...this.getPath().split('.'), 'editDisplay', 'fields'],
      [],
    );
    const prevDisplayedRelations = get(
      schema,
      ['models', ...this.getPath().split('.'), 'editDisplay', 'relations'],
      [],
    );
    const currentDisplayedFields = get(
      this.props.schema,
      ['models', ...this.getPath().split('.'), 'editDisplay', 'fields'],
      [],
    );
    const currentDisplayedRelations = get(
      this.props.schema,
      ['models', ...this.getPath().split('.'), 'editDisplay', 'relations'],
      [],
    );

    if (prevProps.submitSuccess !== this.props.submitSuccess) {
      this.toggle();
    }

    if (
      prevDisplayedFields.length === 0 &&
      currentDisplayedFields.length > 0 &&
      prevState.shouldSelectField !== this.state.shouldSelectField
    ) {
      this.handleClickEditField(0);
    }

    if (
      prevDisplayedRelations.length === 0 &&
      currentDisplayedRelations.length > 0 &&
      prevState.shouldSelectRelation !== this.state.shouldSelectRelation
    ) {
      this.handleClickEditRelation(0);
    }

    if (prevProps.addedField !== this.props.addedField) {
      this.props.setLayout(`${this.getPath()}.editDisplay`);
    }

    if (prevProps.shouldResetGrid !== this.props.shouldResetGrid) {
      this.props.setLayout(`${this.getPath()}.editDisplay`);
    }
  }

  componentWillUnmount() {
    // Reset the modified data
    this.props.onReset();
  }

  getAttrData = attrName =>
    get(this.getEditPageDisplaySettings(), ['availableFields', attrName], {});

  getDefaultSort = () => this.getValue(`${this.getPath()}.defaultSort`, 'string');

  getDropDownItems = () => {
    const name = get(this.props.schema, `models.${this.getPath()}.primaryKey`, 'id');
    // The id attribute is not present on the schema so we need to add it manually
    const defaultAttr = {
      [name]: { name, label: 'Id', type: 'string', searchable: true, sortable: true },
    };
    const attributes = Object.assign(
      get(this.props.schema, `models.${this.getPath()}.attributes`, {}),
      defaultAttr,
    );

    return Object.keys(attributes)
      .filter(attr => {
        return (
          findIndex(this.getListDisplay(), ['name', attr]) === -1 &&
          !attributes[attr].hasOwnProperty('collection') &&
          !attributes[attr].hasOwnProperty('model')
        );
      })
      .map(attr => {
        const searchable = attributes[attr].type !== 'json' && attributes[attr].type !== 'array';
        const obj = Object.assign(attributes[attr], {
          name: attr,
          label: upperFirst(attr),
          searchable,
          sortable: searchable,
        });

        return obj;
      });
  };

  getDropDownFieldItems = () => {
    const currentDisplayedFields = this.getEditPageDisplayedFields();
    const availableFields = this.getEditPageFields();

    return Object.keys(availableFields).filter(field => {
      return currentDisplayedFields.indexOf(field) === -1;
    });
  };

  getDropDownRelationsItems = () => {
    const currentDisplayedRelations = this.getEditPageDisplayedRelations();

    return this.getRelations().filter(relation => {
      return currentDisplayedRelations.indexOf(relation) === -1;
    });
  };

  getEditPageDisplaySettings = () => {
    return get(this.props.schema, 'models.'.concat(this.getPath().concat('.editDisplay')), {
      fields: [],
      relations: [],
    });
  };

  getEditPageDisplayedFields = () => get(this.getEditPageDisplaySettings(), ['fields'], []);

  getEditPageDisplayedRelations = () => get(this.getEditPageDisplaySettings(), ['relations'], []);

  getEditPageFields = () => get(this.props.schema, ['models', ...this.getPath().split('.'), 'editDisplay', 'availableFields'], {});

  getEditPagePossibleEntryTitleFields = () => {
    const availableFields = this.getEditPageFields();
    
    const stringAndNumberFields = Object.keys(availableFields)
      .filter(field => {
        const currentField = availableFields[field];

        return currentField.type === 'string' || currentField.type === 'number';
      });
    
    return [this.getPrimaryKey(), ...stringAndNumberFields];
  }

  getLayout = () => {
    const {
      match: {
        params: { slug, endPoint },
      },
      schema: { layout },
    } = this.props;

    return get(layout, [endPoint || slug, 'attributes'], {});
  };

  getListDisplay = () => get(this.props.schema, `models.${this.getPath()}.listDisplay`, []);

  getModelName = () => {
    const {
      match: {
        params: { slug, endPoint },
      },
    } = this.props;

    return endPoint || slug;
  };

  getPath = () => {
    const {
      match: {
        params: { slug, source, endPoint },
      },
    } = this.props;

    return [slug, source, endPoint].filter(param => param !== undefined).join('.');
  };

  getRelationLabel = attrName => {
    const attrLabel = get(
      this.props.schema,
      ['models', ...this.getPath().split('.'), 'relations', attrName, 'label'],
      'iii',
    );

    return attrLabel;
  };

  getRelations = () => {
    const relations = get(
      this.props.schema,
      'models.'.concat(this.getPath()).concat('.relations'),
      {},
    );

    return Object.keys(relations).filter(relation => {
      const isUploadRelation = get(relations, [relation, 'plugin'], '') === 'upload';
      const isMorphSide =
        get(relations, [relation, 'nature'], '')
          .toLowerCase()
          .includes('morph') && get(relations, [relation, relation]) !== undefined;

      return !isUploadRelation && !isMorphSide;
    });
  };

  getSelectOptions = input => {
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
  };

  getPluginHeaderActions = () => {
    return [
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
    ];
  };

  getPrimaryKey = () =>
    get(this.props.schema, ['models', this.getModelName()].concat(['primaryKey']), 'id');

  getValue = (keys, type) => {
    const value = get(this.props.schema, ['models'].concat(keys.split('.')));

    return type === 'toggle' ? value : value.toString();
  };

  getViewType = () => {
    const { match: { params: { viewType } } } = this.props;


    return viewType;
  }

  generateHeaderNavLinks = () => {
    const { match: { params: { slug, source, endPoint } } } = this.props;
    const suffix = [source, endPoint]
      .reduce((acc, curr) => {
        if (curr) {
          acc = `${acc}/${curr}`;
        }

        return acc;
      }, slug);

    return [
      {
        name: 'content-manager.containers.SettingPage.listSettings.title',
        to: `/plugins/content-manager/ctm-configurations/list-settings/${suffix}`,
      },
      {
        name: 'content-manager.containers.SettingPage.editSettings.title',
        to: `/plugins/content-manager/ctm-configurations/edit-settings/${suffix}`,
      },
    ];
  }

  handleChange = e => {
    const defaultSort = this.getDefaultSort();
    const name = e.target.name.split('.');
    name.pop();
    const attrName = get(this.props.schema.models, name.concat(['name']));
    const isDisablingDefaultSort = attrName === defaultSort && e.target.value === false;

    if (isDisablingDefaultSort) {
      const enableAttrsSort = this.getSelectOptions({ name: 'defaultSort' }).filter(
        attr => attr !== attrName,
      );

      if (enableAttrsSort.length === 0) {
        strapi.notification.info('content-manager.notification.info.SettingPage.disableSort');
      } else {
        const newDefaultSort =
          enableAttrsSort.length === 0 ? this.getPrimaryKey() : enableAttrsSort[0];
        const target = { name: `${this.getPath()}.defaultSort`, value: newDefaultSort };
        this.props.onChangeSettings({ target });
        this.props.onChangeSettings(e);
      }
    } else {
      this.props.onChangeSettings(e);
    }
  };

  handleClickEditAttr = index => {
    const attrToEdit = get(
      this.props.schema,
      ['models'].concat(this.getPath().split('.')).concat(['listDisplay', index]),
      {},
    );
    this.props.onClickEditListItem(attrToEdit);
  };

  handleClickEditField = index => {
    const fieldToEditName = get(
      this.props.schema,
      ['models', ...this.getPath().split('.'), 'editDisplay', 'fields', index],
      '',
    );
    const fieldToEdit = get(
      this.props.schema,
      ['models', ...this.getPath().split('.'), 'editDisplay', 'availableFields', fieldToEditName],
      {},
    );

    return this.props.onClickEditField(fieldToEdit);
  };

  handleClickEditRelation = index => {
    const relationToEditName = get(this.getEditPageDisplayedRelations(), index, '');
    const relationToEdit = get(this.props.schema, [
      'models',
      ...this.getPath().split('.'),
      'relations',
      relationToEditName,
    ]);

    return this.props.onClickEditRelation(relationToEdit);
  };

  handleConfirmReset = () => {
    this.props.onReset();
    this.toggleWarningCancel();
  };

  handleGoBack = () => this.props.history.goBack();

  handleRemove = (index, keys) => {
    const attrToRemove = get(this.getListDisplay(), index, {});
    const defaultSort = this.getDefaultSort();
    const isRemovingDefaultSort = defaultSort === attrToRemove.name;

    if (isRemovingDefaultSort) {
      const enableAttrsSort = this.getSelectOptions({ name: 'defaultSort' }).filter(
        attr => attr !== attrToRemove.name,
      );
      const newDefaultSort = enableAttrsSort.length > 1 ? enableAttrsSort[0] : this.getPrimaryKey();
      const target = { name: `${this.getPath()}.defaultSort`, value: newDefaultSort };
      this.props.onChangeSettings({ target });
    }

    this.props.onRemove(index, keys);
  };

  handleRemoveField = (index, keys) => {
    const {
      settingPage: { fieldToEdit },
    } = this.props;
    const fieldToEditName = get(
      this.props.schema,
      ['models', ...keys.split('.'), 'fields', index],
      '',
    );
    this.manageRemove(index, keys, fieldToEditName, fieldToEdit, false);
  };

  handleRemoveRelation = (index, keys) => {
    const {
      settingPage: { relationToEdit },
    } = this.props;
    const relationToRemoveName = get(this.props.schema, ['models', ...keys.split('.'), index]);
    this.manageRemove(index, keys, relationToRemoveName, relationToEdit);
  };

  manageRemove = (index, keys, itemName, data, isRelation = true) => {
    const isRemovingSelectedItem = isRelation ? itemName === data.alias : itemName === data.name;
    const displayedRelations = this.getEditPageDisplayedRelations();
    const displayedFields = this.getEditPageDisplayedFields();
    const allRelations = this.getRelations();
    const allFields =  Object.keys(get(this.props.schema, ['models', ...this.getPath().split('.'), 'editDisplay', 'availableFields'], {}));

    if (isRemovingSelectedItem && displayedRelations.length === 1 && allFields.length === 0) {
      return strapi.notification.info('content-manager.notification.error.displayedFields');
    }

    if (isRemovingSelectedItem && displayedFields.length === 1 && allRelations.length === 0) {
      return strapi.notification.info('content-manager.notification.error.displayedFields');
    }


    if (isRelation) {
      this.props.onRemoveEditViewRelationAttr(index, keys);
    } else {
      this.props.onRemoveEditViewFieldAttr(index, keys);
    }

    if (isRemovingSelectedItem) {
      const selectNextItemCond = isRelation
        ? displayedRelations.length > 1
        : displayedFields.length > 1;
      const selectOtherItemCond = isRelation
        ? displayedFields.length > 0
        : displayedRelations.length > 0;
      const selectNextFunc = isRelation ? this.handleClickEditRelation : this.handleClickEditField;
      const selectOtherFunc = !isRelation
        ? this.handleClickEditRelation
        : this.handleClickEditField;

      if (selectNextItemCond) {
        let nextIndex = index - 1 > 0 ? index - 1 : index + 1;

        if (!isRelation) {
          const nextItem = get(this.getEditPageDisplayedFields(), nextIndex);

          if (nextItem.includes('__col-md')) {
            nextIndex = index - 2 > 0 ? index - 2 : index + 2;
          }
        }
        selectNextFunc(nextIndex);
      } else if (selectOtherItemCond) {
        selectOtherFunc(0);
      } else {
        const toAdd = isRelation
          ? this.getDropDownFieldItems()[0]
          : this.getDropDownRelationsItems()[0];

        if (isRelation) {
          this.props.onClickAddAttrField(toAdd, `${this.getPath()}.editDisplay.fields`);
          this.setState(prevState => ({ shouldSelectField: !prevState.shouldSelectField }));
        } else {
          this.props.onClickAddAttr(toAdd, `${this.getPath()}.editDisplay.relations`);
          this.setState(prevState => ({ shouldSelectRelation: !prevState.shouldSelectRelation }));
        }
      }
    }
  };

  handleReset = e => {
    e.preventDefault();
    this.setState({ showWarningCancel: true });
  };

  handleSubmit = e => {
    e.preventDefault();
    this.setState({ showWarning: true });
  };

  findIndexFieldToEdit = () => {
    const {
      settingPage: { fieldToEdit },
    } = this.props;

    if (isEmpty(fieldToEdit)) {
      return -1;
    }

    const index = this.getEditPageDisplayedFields().indexOf(fieldToEdit.name);

    return index;
  };

  findIndexListItemToEdit = () => {
    const index = findIndex(this.getListDisplay(), [
      'name',
      get(this.props.settingPage, ['listItemToEdit', 'name']),
    ]);

    return index === -1 ? 0 : index;
  };

  findIndexRelationItemToEdit = () => {
    const {
      settingPage: { relationToEdit },
    } = this.props;

    if (isEmpty(relationToEdit)) {
      return -1;
    }

    const index = this.getEditPageDisplayedRelations().indexOf(relationToEdit.alias);

    return index;
  };

  hasRelations = () => {
    return this.getRelations().length > 0;
  };

  isEditingTextField = () => {
    const {
      settingPage: { fieldToEdit },
    } = this.props;
    const type = get(fieldToEdit, 'type', null);

    return type === 'text';
  }

  shouldDisplayCursorNotAllowed = dropdownType => {
    switch (dropdownType) {
      case 'list':
        return this.getDropDownItems().length === 0;
      case 'relations':
        return this.getDropDownRelationsItems().length === 0;
      case 'fields':
        return this.getDropDownFieldItems().length === 0;
      default:
        return false;
    }
  };

  toggle = () => this.setState(prevState => ({ showWarning: !prevState.showWarning }));

  toggleWarningCancel = () =>
    this.setState(prevState => ({ showWarningCancel: !prevState.showWarningCancel }));

  toggleDropdown = () => {
    if (this.getDropDownItems().length > 0) {
      this.setState(prevState => ({ isOpen: !prevState.isOpen }));
    }
  };

  toggleDropDownFields = () => {
    if (this.getDropDownFieldItems().length > 0) {
      this.setState(prevState => ({ isOpenField: !prevState.isOpenField }));
    }
  };

  toggleDropdownRelations = () => {
    if (this.getDropDownRelationsItems().length > 0) {
      this.setState(prevState => ({ isOpenRelation: !prevState.isOpenRelation }));
    }
  };

  // We need to remove the Over state on the DraggableAttr component
  updateSiblingHoverState = () => {
    this.setState(prevState => ({ isDraggingSibling: !prevState.isDraggingSibling }));
  };

  renderDraggableAttrEditSettingsField = (attr, index) => {
    return (
      <VariableDraggableAttr
        beginMove={this.props.beginMove}
        data={this.getAttrData(attr)}
        draggedItemName={this.props.draggedItemName}
        endMove={this.props.endMove}
        grid={this.props.grid}
        hoverIndex={this.props.hoverIndex}
        id={attr}
        index={index}
        initDragLine={this.props.initDragLine}
        isEditing={index === this.findIndexFieldToEdit()}
        key={attr}
        keys={`${this.getPath()}.editDisplay`}
        layout={this.getLayout()}
        name={attr}
        moveAttr={this.props.moveVariableAttrEditView}
        onRemove={this.handleRemoveField}
        onClickEdit={this.handleClickEditField}
      />
    );
  };

  renderDraggableAttrEditSettingsRelation = (attr, index) => {
    return (
      <DraggableAttr
        index={index}
        isDraggingSibling={false}
        isEditing={index === this.findIndexRelationItemToEdit()}
        key={attr}
        keys={`${this.getPath()}.editDisplay.relations`}
        name={attr}
        label={this.getRelationLabel(attr)}
        moveAttr={this.props.moveAttrEditView}
        onClickEdit={this.handleClickEditRelation}
        onRemove={this.handleRemoveRelation}
        updateSiblingHoverState={() => {}}
      />
    );
  };

  renderDraggableAttrListSettings = (attr, index) => {
    return (
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
          onClickEdit={this.handleClickEditAttr}
          onRemove={this.handleRemove}
          updateSiblingHoverState={this.updateSiblingHoverState}
        />
      </div>
    );
  };

  renderDropDownItemSettingField = item => {
    return (
      <DropdownItem
        key={item}
        onClick={() => this.props.onClickAddAttrField(item, `${this.getPath()}.editDisplay.fields`)}
      >
        {item}
      </DropdownItem>
    );
  };

  renderDropDownItemEditSettingsRelation = item => {
    return (
      <DropdownItem
        key={item}
        onClick={() => this.props.onClickAddAttr(item, `${this.getPath()}.editDisplay.relations`)}
      >
        {item}
      </DropdownItem>
    );
  };

  renderDropDownItemListSettings = item => {
    return (
      <DropdownItem
        key={item.name}
        onClick={() => {
          this.props.onClickAddAttr(item, `${this.getPath()}.listDisplay`);
        }}
      >
        {item.label}
      </DropdownItem>
    );
  };

  renderDropDownP = msg => <p>{msg}</p>;

  renderForm = () => {
    const {
      settingPage: { fieldToEdit, relationToEdit },
    } = this.props;

    if (isEmpty(fieldToEdit)) {
      return forms.editView.relationForm.map(this.renderFormEditSettingsRelation);
    }

    if (isEmpty(relationToEdit)) {
      return forms.editView.fieldForm.map(this.renderFormEditSettingsField);
    }

    return null;
  };

  renderFormEditSettingsField = (input, i) => {
    const {
      onChangeSettings,
      schema,
      settingPage: {
        fieldToEdit: { name },
      },
    } = this.props;
    const path = [...this.getPath().split('.'), 'editDisplay', 'availableFields', name, input.name];
    const value = get(schema, ['models', ...path], '');

    return (
      <Input key={i} onChange={onChangeSettings} value={value} {...input} name={path.join('.')} />
    );
  };

  renderFormEditSettingsRelation = (input, i) => {
    const {
      onChangeSettings,
      schema,
      settingPage: {
        relationToEdit: { alias },
      },
    } = this.props;
    const path = [...this.getPath().split('.'), 'relations', alias, input.name];
    const value = get(schema, ['models', ...path], '');

    return (
      <Input key={i} onChange={onChangeSettings} value={value} {...input} name={path.join('.')} />
    );
  };

  renderFormListAttrSettings = (input, i) => {
    const indexListItemToEdit = this.findIndexListItemToEdit();
    const inputName = `${this.getPath()}.listDisplay.${indexListItemToEdit}.${input.name}`;
    const inputType = this.getListDisplay()[indexListItemToEdit].type;

    if (indexListItemToEdit === -1) {
      return <div key={i} />;
    }

    if (
      (inputType === 'json' || inputType === 'array') &&
      (input.name === 'sortable' || input.name === 'searchable')
    ) {
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
  };

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
  };

  renderEditSettings = () => {
    const { isOpenField, isOpenRelation } = this.state;
    const displayedFieldPath = [...this.getPath().split('.'), 'editDisplay', 'displayedField'];
    const value = get(this.props.schema, ['models', ...displayedFieldPath], null);

    return (
      <Block
        style={{ marginBottom: '13px', paddingBottom: '30px', paddingTop: '25px' }}
      >
        <SectionTitle isSettings />
        <div className="row">
          <div className={cn('col-md-12', styles.editFormTitle)}>
            <FormTitle
              title="content-manager.containers.SettingPage.editSettings.entry.title"
              description="content-manager.containers.SettingPage.editSettings.entry.title.description"
            />
          </div>
          <div className="col-md-4">
            <InputSelect
              name={displayedFieldPath.join('.')}
              onChange={this.props.onChangeSettings}
              style={{ marginBottom: '6px' }}
              selectOptions={this.getEditPagePossibleEntryTitleFields()}
              value={value}
            />
          </div>
          <div className="col-md-12">
            <div className={styles.separatorHigher} />
          </div>
        </div>

        <SectionTitle />
        <div className="row">
          <div className={cn('col-md-8', styles.draggedDescription, styles.edit_settings)}>
            <FormTitle
              title="content-manager.global.displayedFields"
              description="content-manager.containers.SettingPage.editSettings.description"
            />
            <div className={cn(styles.sort_wrapper, 'col-md-12', styles.padded)}>
              <CustomDragLayer />
              <div className={cn('row', styles.noPadding)}>
                {this.getEditPageDisplayedFields().map(
                  this.renderDraggableAttrEditSettingsField,
                )}
                <div className={cn('col-md-6')}>
                  <div
                    className={cn(
                      styles.dropdownRelations,
                      styles.dropdownWrapper,
                      isOpenField && styles.dropdownWrapperOpen,
                      this.shouldDisplayCursorNotAllowed('fields') &&
                        styles.dropDownNotAllowed,
                    )}
                  >
                    <ButtonDropdown isOpen={isOpenField} toggle={this.toggleDropDownFields}>
                      <DropdownToggle>
                        <FormattedMessage id="content-manager.containers.SettingPage.addField">
                          {this.renderDropDownP}
                        </FormattedMessage>
                      </DropdownToggle>
                      <DropdownMenu>
                        {this.getDropDownFieldItems().map(
                          this.renderDropDownItemSettingField,
                        )}
                      </DropdownMenu>
                    </ButtonDropdown>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RELATIONS SORT */}
          {this.hasRelations() && (
            <div className={cn('col-md-4', styles.draggedDescription, styles.edit_settings)}>
              <FormTitle
                title="content-manager.containers.SettingPage.relations"
                description="content-manager.containers.SettingPage.editSettings.description"
              />
              <div className={cn(styles.sort_wrapper, 'col-md-12')}>
                <div className="row">
                  {/* DRAGGABLE BLOCK */}
                  {this.getEditPageDisplayedRelations().map(
                    this.renderDraggableAttrEditSettingsRelation,
                  )}
                  {/* DRAGGABLE BLOCK */}
                  <div
                    className={cn(
                      styles.dropdownRelations,
                      styles.dropdownWrapper,
                      isOpenRelation && styles.dropdownWrapperOpen,
                      this.shouldDisplayCursorNotAllowed('relations') &&
                        styles.dropDownNotAllowed,
                    )}
                  >
                    <ButtonDropdown
                      isOpen={isOpenRelation}
                      toggle={this.toggleDropdownRelations}
                    >
                      <DropdownToggle>
                        <FormattedMessage id="content-manager.containers.SettingPage.addRelationalField">
                          {this.renderDropDownP}
                        </FormattedMessage>
                      </DropdownToggle>
                      <DropdownMenu>
                        {this.getDropDownRelationsItems().map(
                          this.renderDropDownItemEditSettingsRelation,
                        )}
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
            <div className={styles.editWrapper} style={{ paddingTop: '26px' }}>
              <div className="row">
                {this.renderForm()}
                {/* DISPLAY A TOGGLE THAT CHANGES THE TEXTAREA TO WYSIWYG */}
                {/* @aurelsicoko remove this line if you want to remove this feature */}
                {this.isEditingTextField() && this.renderInputWysiwyg()}
              </div>
            </div>
          </div>
        </div>
        {/* EDIT MAIN ATTR FORM */}
      </Block>
    );
  }

  renderListSettings = () => {
    const { isOpen } = this.state;

    return (
      <Block
        style={{ marginBottom: '13px', paddingBottom: '30px', paddingTop: '25px' }}
      >
        <SectionTitle isSettings />
        <div className="row">
          {/* GENERAL LIST SETTINGS FORM */}
          <div className="col-md-12">
            <div className="row">{forms.inputs.map(this.renderInputMainSettings)}</div>
          </div>

          <div className="col-md-12">
            <div className={styles.separatorHigher} />
          </div>
        </div>
        <SectionTitle />
        <div className="row">
          <div className={cn('col-md-12', styles.draggedDescription)}>
            <FormTitle
              title="content-manager.global.displayedFields"
              description="content-manager.containers.SettingPage.attributes.description"
            />
          </div>

          <div className="col-md-5">
            {this.getListDisplay().map(this.renderDraggableAttrListSettings)}
            <div
              className={cn(
                styles.dropdownWrapper,
                isOpen && styles.dropdownWrapperOpen,
                this.shouldDisplayCursorNotAllowed('list') && styles.dropDownNotAllowed,
              )}
            >
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
              <div className="row">{forms.editList.map(this.renderFormListAttrSettings)}</div>
            </div>
          </div>
          {/* LIST ATTR FORM */}
        </div>
      </Block>
    );
  };

  renderInputWysiwyg = () => {
    const {
      match: {
        params: { slug, endPoint },
      },
      onChangeInputType,
      settingPage: { fieldToEdit },
    } = this.props;

    const inputName = get(fieldToEdit, 'name', null);
    const name = `layout.${endPoint || slug}.attributes.${inputName}.appearance`;
    const value = get(this.getLayout(), [inputName, 'appearance']) === 'WYSIWYG';

    return <Input label={{ id: 'content-manager.form.Input.wysiwyg'}} type="toggle" name={name} onChange={onChangeInputType} value={value} />;
  }

  render() {
    const { showWarning, showWarningCancel } = this.state;
    const { match: { params: { viewType } }, onSubmit } = this.props;
    const content = viewType === 'list-settings' ? this.renderListSettings : this.renderEditSettings;

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

          <HeaderNav links={this.generateHeaderNavLinks()} />
          <div className={cn('row', styles.container)}>
            {content()}
          </div>
        </div>
      </form>
    );
  }
}

SettingPage.defaultProps = {
  draggedItemName: null,
  grid: [],
};

SettingPage.propTypes = {
  addedField: PropTypes.bool.isRequired,
  beginMove: PropTypes.func.isRequired,
  draggedItemName: PropTypes.string,
  endMove: PropTypes.func.isRequired,
  grid: PropTypes.array,
  history: PropTypes.object.isRequired,
  hoverIndex: PropTypes.number.isRequired,
  initDragLine: PropTypes.number.isRequired,
  match: PropTypes.object.isRequired,
  moveAttr: PropTypes.func.isRequired,
  moveAttrEditView: PropTypes.func.isRequired,
  moveVariableAttrEditView: PropTypes.func.isRequired,
  onChangeInputType: PropTypes.func.isRequired,
  onChangeSettings: PropTypes.func.isRequired,
  onClickAddAttr: PropTypes.func.isRequired,
  onClickAddAttrField: PropTypes.func.isRequired,
  onClickEditField: PropTypes.func.isRequired,
  onClickEditListItem: PropTypes.func.isRequired,
  onClickEditRelation: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onRemoveEditViewFieldAttr: PropTypes.func.isRequired,
  onRemoveEditViewRelationAttr: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  schema: PropTypes.object.isRequired,
  setLayout: PropTypes.func.isRequired,
  settingPage: PropTypes.object.isRequired,
  shouldResetGrid: PropTypes.bool.isRequired,
  submitSuccess: PropTypes.bool.isRequired,
};

const mapDispatchToProps = dispatch =>
  bindActionCreators(
    {
      beginMove,
      endMove,
      moveAttr,
      moveAttrEditView,
      moveVariableAttrEditView,
      onChangeInputType,
      onChangeSettings,
      onClickAddAttr,
      onClickAddAttrField,
      onClickEditField,
      onClickEditListItem,
      onClickEditRelation,
      onRemove,
      onRemoveEditViewFieldAttr,
      onRemoveEditViewRelationAttr,
      onReset,
      onSubmit,
      setLayout,
    },
    dispatch,
  );
const mapStateToProps = createStructuredSelector({
  addedField: makeSelectAddedField(),
  draggedItemName: makeSelectDraggedItemName(),
  grid: makeSelectGrid(),
  hoverIndex: makeSelectHoverIndex(),
  initDragLine: makeSelectInitDragLine(),
  schema: makeSelectModifiedSchema(),
  settingPage: makeSelectSettingPage(),
  shouldResetGrid: makeSelectShouldResetGrid(),
  submitSuccess: makeSelectSubmitSuccess(),
});
const withConnect = connect(
  mapStateToProps,
  mapDispatchToProps,
);
const withReducer = strapi.injectReducer({ key: 'settingPage', reducer, pluginId });
const withSaga = strapi.injectSaga({ key: 'settingPage', saga, pluginId });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(DragDropContext(HTML5Backend)(SettingPage));
