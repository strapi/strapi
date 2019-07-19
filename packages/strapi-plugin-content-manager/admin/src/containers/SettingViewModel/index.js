import React, { memo, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { get, isEqual, isEmpty, upperFirst } from 'lodash';

import {
  BackHeader,
  HeaderNav,
  InputsIndex as Input,
  PluginHeader,
  PopUpWarning,
  LoadingIndicatorPage,
} from 'strapi-helper-plugin';
import pluginId from '../../pluginId';

import Block from '../../components/Block';
import Container from '../../components/Container';
import FormTitle from '../../components/FormTitle';
import SectionTitle from '../../components/SectionTitle';

import LayoutTitle from './LayoutTitle';
import ListLayout from './ListLayout';
import Separator from './Separator';

import {
  addFieldToList,
  getData,
  moveListField,
  onChange,
  onReset,
  onSubmit,
  onRemoveListField,
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
  emitEvent,
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
  onChange,
  onRemoveListField,
  onReset,
  onSubmit,
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
  }, [shouldToggleModalSubmit, showWarningSubmit]);

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  const getPluginHeaderActions = () => {
    if (isEqual(modifiedData, initialData)) {
      return [];
    }

    return [
      {
        label: 'content-manager.popUpWarning.button.cancel',
        kind: 'secondary',
        onClick: toggleWarningCancel,
        type: 'button',
      },
      {
        kind: 'primary',
        label: 'content-manager.containers.Edit.submit',
        onClick: () => {
          toggleWarningSubmit();
          emitEvent('willSaveContentTypeLayout');
        },
        type: 'submit',
      },
    ];
  };
  const getListDisplayedFields = () =>
    get(modifiedData, ['layouts', 'list'], []);
  const getListRemainingFields = () => {
    const metadata = get(modifiedData, ['metadata'], {});

    return Object.keys(metadata)
      .filter(key => !isEmpty(get(modifiedData, ['metadata', key, 'list'])))
      .filter(field => {
        return !getListDisplayedFields().includes(field);
      });
  };
  const getSelectOptions = input => {
    if (input.name === 'settings.defaultSortBy') {
      return getListDisplayedFields();
    }

    return input.selectOptions;
  };

  return (
    <>
      <BackHeader onClick={() => goBack()} />
      <Container className="container-fluid">
        <PluginHeader
          actions={getPluginHeaderActions()}
          title={{
            id: `${pluginId}.containers.SettingViewModel.pluginHeader.title`,
            values: { name: upperFirst(name) },
          }}
          description={{
            id:
              'content-manager.containers.SettingPage.pluginHeaderDescription',
          }}
        />
        <HeaderNav
          links={[
            {
              name: 'content-manager.containers.SettingPage.listSettings.title',
              to: getUrl(name, 'list-settings'),
            },
            {
              name: 'content-manager.containers.SettingPage.editSettings.title',
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
              <LayoutTitle className="col-12">
                <FormTitle
                  title={`${pluginId}.global.displayedFields`}
                  description={`${pluginId}.containers.SettingPage.${
                    settingType === 'list-settings'
                      ? 'attributes'
                      : 'editSettings'
                  }.description`}
                />
              </LayoutTitle>

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
                />
              )}
            </div>
          </Block>
        </div>
      </Container>
      <PopUpWarning
        isOpen={showWarningCancel}
        toggleModal={toggleWarningCancel}
        content={{
          title: 'content-manager.popUpWarning.title',
          message: 'content-manager.popUpWarning.warning.cancelAllSettings',
          cancel: 'content-manager.popUpWarning.button.cancel',
          confirm: 'content-manager.popUpWarning.button.confirm',
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
          title: 'content-manager.popUpWarning.title',
          message: 'content-manager.popUpWarning.warning.updateAllSettings',
          cancel: 'content-manager.popUpWarning.button.cancel',
          confirm: 'content-manager.popUpWarning.button.confirm',
        }}
        popUpWarningType="danger"
        onConfirm={() => onSubmit(name, emitEvent)}
      />
    </>
  );
}

SettingViewModel.propTypes = {
  addFieldToList: PropTypes.func.isRequired,
  emitEvent: PropTypes.func.isRequired,
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
  onChange: PropTypes.func.isRequired,
  onRemoveListField: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  resetProps: PropTypes.func.isRequired,
  setListFieldToEditIndex: PropTypes.func.isRequired,
  shouldToggleModalSubmit: PropTypes.bool.isRequired,
};

const mapStateToProps = makeSelectSettingViewModel();

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      addFieldToList,
      getData,
      moveListField,
      onChange,
      onRemoveListField,
      onReset,
      onSubmit,
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
