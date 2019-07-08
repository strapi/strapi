import React, { memo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';

import { LoadingIndicatorPage } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';

import { getLayout } from '../Main/actions';

import reducer from './reducer';
import saga from './saga';
import makeSelectListView from './selectors';

function ListView({
  getLayout,
  layouts,
  match: {
    params: { slug },
  },
}) {
  strapi.useInjectReducer({ key: 'listView', reducer, pluginId });
  strapi.useInjectSaga({ key: 'listView', saga, pluginId });

  // Display a loader if the layout from the main reducer is empty
  const shouldShowLoader = layouts[slug] === undefined;

  useEffect(() => {
    if (shouldShowLoader) {
      getLayout(slug);
    }
  }, [shouldShowLoader]);

  if (shouldShowLoader) {
    return <LoadingIndicatorPage />;
  }

  return (
    <div>
      <div>Coming</div>
    </div>
  );
}
ListView.defaultProps = {
  layouts: {},
};

ListView.propTypes = {
  getLayout: PropTypes.func.isRequired,
  layouts: PropTypes.object,
  match: PropTypes.shape({
    params: PropTypes.shape({
      slug: PropTypes.string.isRequired,
    }),
  }),
};

const mapStateToProps = makeSelectListView();

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      getLayout,
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
)(ListView);
