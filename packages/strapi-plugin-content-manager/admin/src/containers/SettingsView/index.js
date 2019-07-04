import React, { memo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';

import { LoadingIndicatorPage } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';

import { getData } from './actions';
import reducer from './reducer';
import saga from './saga';
import makeSelectSettingView from './selectors';

function SettingsView({ getData, isLoading }) {
  strapi.useInjectReducer({ key: 'settingsView', reducer, pluginId });
  strapi.useInjectSaga({ key: 'settingsView', saga, pluginId });

  useEffect(() => {
    getData();
  }, []);

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  return <div>SettingsView</div>;
}

SettingsView.propTypes = {
  getData: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
};

const mapStateToProps = makeSelectSettingView();

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
)(SettingsView);
