import React, { memo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { upperFirst } from 'lodash';

import { BackHeader, HeaderNav, PluginHeader } from 'strapi-helper-plugin';
import pluginId from '../../pluginId';

import Container from '../../components/Container';

import { getData } from './actions';
import reducer from './reducer';
import saga from './saga';
import makeSelectSettingViewModel from './selectors';

const getUrl = (name, to) =>
  `/plugins/${pluginId}/ctm-configurations/models/${name}/${to}`;

function SettingViewModel({
  getData,
  history: { goBack },
  match: {
    params: { name },
  },
}) {
  strapi.useInjectReducer({ key: 'settingViewModel', reducer, pluginId });
  strapi.useInjectSaga({ key: 'settingViewModel', saga, pluginId });

  useEffect(() => {
    getData(name);
  }, []);

  return (
    <>
      <BackHeader onClick={() => goBack()} />
      <Container className="container-fluid">
        <PluginHeader
          actions={[]}
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
      </Container>
    </>
  );
}

SettingViewModel.defaultProps = {};
SettingViewModel.propTypes = {
  getData: PropTypes.func.isRequired,
  history: PropTypes.shape({
    goBack: PropTypes.func,
  }).isRequired,
  match: PropTypes.shape({
    params: PropTypes.shape({
      name: PropTypes.string,
    }),
  }).isRequired,
};

const mapStateToProps = makeSelectSettingViewModel();

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      getData,
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
