import React, { memo, useEffect, useState } from 'react';
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
} from 'strapi-helper-plugin';
import pluginId from '../../pluginId';

import Block from '../../components/Block';
import Container from '../../components/Container';
import SectionTitle from '../../components/SectionTitle';

import { getData, onChange, onReset, onSubmit } from './actions';
import reducer from './reducer';
import saga from './saga';
import makeSelectSettingViewModel from './selectors';

import forms from './forms.json';

const getUrl = (name, to) =>
  `/plugins/${pluginId}/ctm-configurations/models/${name}/${to}`;

function SettingViewModel({
  emitEvent,
  getData,
  history: { goBack },
  initialData,
  match: {
    params: { name, settingType },
  },
  modifiedData,
  onChange,
  onReset,
  onSubmit,
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
  }, []);
  useEffect(() => {
    if (showWarningSubmit) {
      toggleWarningSubmit();
    }
  }, [shouldToggleModalSubmit]);

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
  const getSelectOptions = input => {
    if (input.name === 'settings.defaultSortBy') {
      return get(modifiedData, ['layouts', 'list'], []);
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

SettingViewModel.defaultProps = {};
SettingViewModel.propTypes = {
  emitEvent: PropTypes.func.isRequired,
  getData: PropTypes.func.isRequired,
  history: PropTypes.shape({
    goBack: PropTypes.func,
  }).isRequired,
  initialData: PropTypes.object.isRequired,
  match: PropTypes.shape({
    params: PropTypes.shape({
      name: PropTypes.string,
    }),
  }).isRequired,

  modifiedData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  shouldToggleModalSubmit: PropTypes.bool.isRequired,
};

const mapStateToProps = makeSelectSettingViewModel();

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      getData,
      onChange,
      onReset,
      onSubmit,
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
