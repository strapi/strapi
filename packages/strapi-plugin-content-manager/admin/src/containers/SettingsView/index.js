import React, { memo, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { isEqual, isEmpty } from 'lodash';

import {
  InputsIndex as Input,
  LoadingIndicatorPage,
  PluginHeader,
  PopUpWarning,
} from 'strapi-helper-plugin';

import pluginId from '../../pluginId';

import Container from '../../components/Container';
import Block from '../../components/Block';
import Row from './Row';

import { getData, onChange, onReset, onSubmit } from './actions';
import reducer from './reducer';
import saga from './saga';
import makeSelectSettingView from './selectors';

import form from './forms.json';

function SettingsView({
  getData,
  initialData,
  isLoading,
  modifiedData,
  onChange,
  onReset,
  onSubmit,
  shouldToggleModalSubmit,
}) {
  strapi.useInjectReducer({ key: 'settingsView', reducer, pluginId });
  strapi.useInjectSaga({ key: 'settingsView', saga, pluginId });
  const [showWarningCancel, setWarningOpen] = useState(false);
  const [showWarningSubmit, setWarningSubmitOpen] = useState(false);
  const toggleWarningCancel = () => setWarningOpen(prevState => !prevState);
  const toggleWarningSubmit = () =>
    setWarningSubmitOpen(prevState => !prevState);

  useEffect(() => {
    if (showWarningSubmit) {
      toggleWarningSubmit();
    }
  }, [shouldToggleModalSubmit]);
  useEffect(() => {
    if (isEmpty(initialData)) {
      getData();
    }
  }, [initialData]);

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  const getPluginHeaderActions = () => {
    if (!isEqual(initialData, modifiedData)) {
      return [
        {
          id: 'cancelChanges',
          label: 'content-manager.popUpWarning.button.cancel',
          kind: 'secondary',
          onClick: toggleWarningCancel,
          type: 'button',
        },
        {
          kind: 'primary',
          label: 'content-manager.containers.Edit.submit',
          onClick: toggleWarningSubmit,
          type: 'submit',
        },
      ];
    }

    return [];
  };

  return (
    <Container className="container-fluid">
      <PluginHeader
        actions={getPluginHeaderActions()}
        title="Content Manager"
        description={{
          id: 'content-manager.containers.SettingsPage.pluginHeaderDescription',
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
        onConfirm={() => onSubmit()}
      />
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
      <Row className="row">
        <Block
          description="content-manager.containers.SettingsPage.Block.generalSettings.description"
          title="content-manager.containers.SettingsPage.Block.generalSettings.title"
        >
          <form style={{ paddingTop: '2.6rem' }}>
            <div className="row">
              {form.map(input => (
                <Input
                  key={input.name}
                  onChange={onChange}
                  value={modifiedData[input.name]}
                  {...input}
                />
              ))}
            </div>
          </form>
        </Block>
      </Row>
    </Container>
  );
}

SettingsView.propTypes = {
  getData: PropTypes.func.isRequired,
  initialData: PropTypes.object.isRequired,
  isLoading: PropTypes.bool.isRequired,
  modifiedData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  shouldToggleModalSubmit: PropTypes.bool.isRequired,
};

const mapStateToProps = makeSelectSettingView();

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
)(SettingsView);
