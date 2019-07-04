import React, { memo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { isEqual, isEmpty } from 'lodash';

import {
  InputsIndex as Input,
  LoadingIndicatorPage,
  PluginHeader,
} from 'strapi-helper-plugin';

import pluginId from '../../pluginId';

import Container from '../../components/Container';
import Block from '../../components/Block';
import Row from './Row';

import { getData, onChange } from './actions';
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
}) {
  strapi.useInjectReducer({ key: 'settingsView', reducer, pluginId });
  strapi.useInjectSaga({ key: 'settingsView', saga, pluginId });

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
          onClick: () => {},
          type: 'button',
        },
        {
          kind: 'primary',
          label: 'content-manager.containers.Edit.submit',
          onClick: () => {},
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
};

const mapStateToProps = makeSelectSettingView();

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      getData,
      onChange,
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
