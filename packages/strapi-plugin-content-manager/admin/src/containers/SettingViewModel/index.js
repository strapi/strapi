import React, { memo, useEffect, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { get, isEqual, upperFirst } from 'lodash';

import {
  BackHeader,
  HeaderNav,
  InputsIndex as Input,
  PluginHeader,
  PopUpWarning,
  LoadingIndicatorPage,
} from 'strapi-helper-plugin';

import pluginId from '../../pluginId';
import { LayoutDndProvider } from '../../contexts/LayoutDnd';

import Block from '../../components/Block';
import Container from '../../components/Container';
import FieldsReorder from '../../components/FieldsReorder';
import FormTitle from '../../components/FormTitle';
import LayoutTitle from '../../components/LayoutTitle';
import SectionTitle from '../../components/SectionTitle';
import Separator from '../../components/Separator';
import SortableList from '../../components/SortableList';

import ListLayout from './ListLayout';

import {
  addFieldToList,
  addRelation,
  formatLayout,
  getData,
  moveListField,
  moveRow,
  moveRelation,
  onAddData,
  onChange,
  onReset,
  onSubmit,
  onRemoveListField,
  removeField,
  removeRelation,
  reorderDiffRow,
  reorderRow,
  resetProps,
  setListFieldToEditIndex,
} from './actions';
import reducer from './reducer';
import saga from './saga';
import makeSelectSettingViewModel from './selectors';

import forms from './forms.json';

const getUrl = (name, to) =>
  `/plugins/${pluginId}/ctm-configurations/models/${name}/${to}`;

function SettingViewModel({
  addFieldToList,
  addRelation,
  didDrop,
  emitEvent,
  formatLayout,
  getData,
  history: { goBack },
  initialData,
  isLoading,
  listFieldToEditIndex,
  match: {
    params: { name, settingType },
  },
  modifiedData,
  moveListField,
  moveRelation,
  moveRow,
  onAddData,
  onChange,
  onRemoveListField,
  onReset,
  onSubmit,
  removeField,
  removeRelation,
  reorderDiffRow,
  reorderRow,
  resetProps,
  setListFieldToEditIndex,
  shouldToggleModalSubmit,
}) {
  strapi.useInjectReducer({ key: 'settingViewModel', reducer, pluginId });
  strapi.useInjectSaga({ key: 'settingViewModel', saga, pluginId });
  const [showWarningSubmit, setWarningSubmit] = useState(false);
  const [showWarningCancel, setWarningCancel] = useState(false);
  const toggleWarningSubmit = () => setWarningSubmit(prevState => !prevState);
  const toggleWarningCancel = () => setWarningCancel(prevState => !prevState);

  useEffect(() => {
    getData(name);

    return () => {
      resetProps();
    };
  }, [getData, name, resetProps]);

  useEffect(() => {
    if (showWarningSubmit) {
      toggleWarningSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldToggleModalSubmit]);

  useEffect(() => {
    if (!isLoading) {
      formatLayout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [didDrop]);

  const getAttributes = useCallback(() => {
    return get(modifiedData, ['schema', 'attributes'], {});
  }, [modifiedData]);

  const getEditLayout = useCallback(() => {
    return get(modifiedData, ['layouts', 'edit'], []);
  }, [modifiedData]);

  const getRelationsLayout = useCallback(() => {
    return get(modifiedData, ['layouts', 'editRelations'], []);
  }, [modifiedData]);

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  const handleSubmit = e => {
    e.preventDefault();
    toggleWarningSubmit();
    emitEvent('willSaveContentTypeLayout');
  };

  const getPluginHeaderActions = () => {
    if (isEqual(modifiedData, initialData)) {
      return [];
    }

    return [
      {
        label: `${pluginId}.popUpWarning.button.cancel`,
        kind: 'secondary',
        onClick: toggleWarningCancel,
        type: 'button',
      },
      {
        kind: 'primary',
        label: `${pluginId}.containers.Edit.submit`,
        onClick: e => {
          handleSubmit(e);
        },
        type: 'submit',
      },
    ];
  };

  const getListDisplayedFields = () =>
    get(modifiedData, ['layouts', 'list'], []);
  const getEditRemainingFields = () => {
    const attributes = getAttributes();
    const metadatas = get(modifiedData, ['metadatas'], {});
    const displayedFields = getEditLayout().reduce(
      (acc, curr) => [...acc, ...curr.rowContent],
      []
    );

    return Object.keys(attributes)
      .filter(attr => get(attributes, [attr, 'type'], '') !== 'relation')
      .filter(attr => get(metadatas, [attr, 'edit', 'visible'], false) === true)
      .filter(attr => {
        return displayedFields.findIndex(el => el.name === attr) === -1;
      });
  };
  const getEditRelationsRemaingFields = () => {
    const attributes = getAttributes();
    const displayedFields = getRelationsLayout();

    return Object.keys(attributes)
      .filter(attr => get(attributes, [attr, 'type'], '') === 'relation')
      .filter(attr => displayedFields.indexOf(attr) === -1);
  };
  const getListRemainingFields = () => {
    const metadatas = get(modifiedData, ['metadatas'], {});
    const attributes = getAttributes();

    return Object.keys(metadatas)
      .filter(key => {
        const type = get(attributes, [key, 'type'], '');

        return !['json', 'relation', 'group'].includes(type) && !!type;
      })
      .filter(field => {
        return !getListDisplayedFields().includes(field);
      });
  };
  const getSelectOptions = input => {
    if (input.name === 'settings.defaultSortBy') {
      return getListDisplayedFields();
    }

    if (input.name === 'settings.mainField') {
      const attributes = getAttributes();
      const options = Object.keys(attributes).filter(attr => {
        const type = get(attributes, [attr, 'type'], '');

        return (
          !['json', 'text', 'relation', 'group', 'boolean', 'date'].includes(
            type
          ) && !!type
        );
      });

      return ['id', ...options];
    }

    return input.selectOptions;
  };

  const moveItem = (dragIndex, hoverIndex, dragRowIndex, hoverRowIndex) => {
    // Same row = just reorder
    if (dragRowIndex === hoverRowIndex) {
      reorderRow(dragRowIndex, dragIndex, hoverIndex);
    } else {
      reorderDiffRow(dragIndex, hoverIndex, dragRowIndex, hoverRowIndex);
    }
  };

  return (
    <LayoutDndProvider
      attributes={getAttributes()}
      buttonData={getEditRemainingFields()}
      layout={getEditLayout()}
      moveItem={moveItem}
      moveRow={moveRow}
      onAddData={onAddData}
      relationsLayout={getRelationsLayout()}
      removeField={removeField}
    >
      <BackHeader onClick={() => goBack()} />
      <Container className="container-fluid">
        <form onSubmit={handleSubmit}>
          <PluginHeader
            actions={getPluginHeaderActions()}
            title={{
              id: `${pluginId}.containers.SettingViewModel.pluginHeader.title`,
              values: { name: upperFirst(name) },
            }}
            description={{
              id: `${pluginId}.containers.SettingPage.pluginHeaderDescription`,
            }}
          />
          <HeaderNav
            links={[
              {
                name:
                  'content-manager.containers.SettingPage.listSettings.title',
                to: getUrl(name, 'list-settings'),
              },
              {
                name:
                  'content-manager.containers.SettingPage.editSettings.title',
                to: getUrl(name, 'edit-settings'),
              },
            ]}
          />
          <div className="row">
            <Block
              style={{
                marginBottom: '13px',
                paddingBottom: '30px',
                paddingTop: '30px',
              }}
            >
              <SectionTitle isSettings />
              <div className="row">
                {forms[settingType].map(input => {
                  return (
                    <Input
                      key={input.name}
                      {...input}
                      onChange={onChange}
                      selectOptions={getSelectOptions(input)}
                      value={get(modifiedData, input.name)}
                    />
                  );
                })}
                <div className="col-12">
                  <Separator />
                </div>
              </div>
              <SectionTitle />

              <div className="row">
                <LayoutTitle
                  className={
                    settingType === 'list-settings' ? 'col-12' : 'col-8'
                  }
                >
                  <FormTitle
                    title={`${pluginId}.global.displayedFields`}
                    description={`${pluginId}.containers.SettingPage.${
                      settingType === 'list-settings'
                        ? 'attributes'
                        : 'editSettings'
                    }.description`}
                  />
                </LayoutTitle>
                {settingType === 'edit-settings' && (
                  <LayoutTitle className="col-4">
                    <FormTitle
                      title={`${pluginId}.containers.SettingPage.relations`}
                      description={`${pluginId}.containers.SettingPage.${
                        settingType === 'list-settings'
                          ? 'attributes'
                          : 'editSettings'
                      }.description`}
                    />
                  </LayoutTitle>
                )}

                {settingType === 'list-settings' && (
                  <ListLayout
                    addField={addFieldToList}
                    displayedData={getListDisplayedFields()}
                    availableData={getListRemainingFields()}
                    fieldToEditIndex={listFieldToEditIndex}
                    modifiedData={modifiedData}
                    moveListField={moveListField}
                    onClick={setListFieldToEditIndex}
                    onChange={onChange}
                    onRemove={onRemoveListField}
                    onSubmit={handleSubmit}
                  />
                )}

                {settingType === 'edit-settings' && <FieldsReorder />}
                {settingType === 'edit-settings' && (
                  <SortableList
                    addItem={addRelation}
                    buttonData={getEditRelationsRemaingFields()}
                    moveItem={moveRelation}
                    removeItem={removeRelation}
                  />
                )}
              </div>
            </Block>
          </div>
        </form>
      </Container>
      <PopUpWarning
        isOpen={showWarningCancel}
        toggleModal={toggleWarningCancel}
        content={{
          title: `${pluginId}.popUpWarning.title`,
          message: `${pluginId}.popUpWarning.warning.cancelAllSettings`,
          cancel: `${pluginId}.popUpWarning.button.cancel`,
          confirm: `${pluginId}.popUpWarning.button.confirm`,
        }}
        popUpWarningType="danger"
        onConfirm={() => {
          onReset();
          toggleWarningCancel();
        }}
      />
      <PopUpWarning
        isOpen={showWarningSubmit}
        toggleModal={toggleWarningSubmit}
        content={{
          title: `${pluginId}.popUpWarning.title`,
          message: `${pluginId}.popUpWarning.warning.updateAllSettings`,
          cancel: `${pluginId}.popUpWarning.button.cancel`,
          confirm: `${pluginId}.popUpWarning.button.confirm`,
        }}
        popUpWarningType="danger"
        onConfirm={() => onSubmit(name, emitEvent)}
      />
    </LayoutDndProvider>
  );
}

SettingViewModel.propTypes = {
  addFieldToList: PropTypes.func.isRequired,
  addRelation: PropTypes.func.isRequired,
  didDrop: PropTypes.bool.isRequired,
  emitEvent: PropTypes.func.isRequired,
  formatLayout: PropTypes.func.isRequired,
  getData: PropTypes.func.isRequired,
  history: PropTypes.shape({
    goBack: PropTypes.func,
  }).isRequired,
  initialData: PropTypes.object.isRequired,
  isLoading: PropTypes.bool.isRequired,
  listFieldToEditIndex: PropTypes.number.isRequired,
  match: PropTypes.shape({
    params: PropTypes.shape({
      name: PropTypes.string,
      settingType: PropTypes.string,
    }),
  }).isRequired,
  modifiedData: PropTypes.object.isRequired,
  moveListField: PropTypes.func.isRequired,
  moveRelation: PropTypes.func.isRequired,
  moveRow: PropTypes.func.isRequired,
  onAddData: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onRemoveListField: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  removeField: PropTypes.func.isRequired,
  removeRelation: PropTypes.func.isRequired,
  reorderDiffRow: PropTypes.func.isRequired,
  reorderRow: PropTypes.func.isRequired,
  resetProps: PropTypes.func.isRequired,
  setListFieldToEditIndex: PropTypes.func.isRequired,
  shouldToggleModalSubmit: PropTypes.bool.isRequired,
};

const mapStateToProps = makeSelectSettingViewModel();

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      addFieldToList,
      addRelation,
      formatLayout,
      getData,
      moveListField,
      moveRelation,
      moveRow,
      onAddData,
      onChange,
      onRemoveListField,
      onReset,
      onSubmit,
      removeField,
      removeRelation,
      reorderDiffRow,
      reorderRow,
      resetProps,
      setListFieldToEditIndex,
    },
    dispatch
  );
}
const withConnect = connect(
  mapStateToProps,
  mapDispatchToProps
);

export default compose(
  withConnect,
  memo
)(SettingViewModel);
