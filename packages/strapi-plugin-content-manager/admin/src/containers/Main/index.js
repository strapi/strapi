import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { Switch, Route } from 'react-router-dom';
import {
  CheckPagePermissions,
  LoadingIndicatorPage,
  NotFound,
  request,
} from 'strapi-helper-plugin';
import { DndProvider } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import pluginId from '../../pluginId';
import pluginPermissions from '../../permissions';
import { getRequestUrl } from '../../utils';
import DragLayer from '../../components/DragLayer';
import CollectionTypeRecursivePath from '../CollectionTypeRecursivePath';
import ComponentSettingsView from '../ComponentSetttingsView';
import SingleTypeRecursivePath from '../SingleTypeRecursivePath';
import { getData, getDataSucceeded, resetProps } from './actions';
import makeSelectMain from './selectors';

function Main({ getData, getDataSucceeded, isLoading, resetProps }) {
  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    const fetchData = async signal => {
      getData();

      try {
        const [{ data: components }, { data: models }] = await Promise.all(
          ['components', 'content-types'].map(endPoint =>
            request(getRequestUrl(endPoint), { method: 'GET', signal })
          )
        );

        getDataSucceeded(models, components);
      } catch (err) {
        console.error(err);
        strapi.notification.error('notification.error');
      }
    };

    fetchData(signal);

    return () => {
      abortController.abort();
      resetProps();
    };
  }, [getData, getDataSucceeded, resetProps]);

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <DragLayer />

      <Switch>
        <Route path={`/plugins/${pluginId}/components/:uid/configurations/edit`}>
          <CheckPagePermissions permissions={pluginPermissions.componentsConfigurations}>
            <ComponentSettingsView />
          </CheckPagePermissions>
        </Route>
        <Route
          path={`/plugins/${pluginId}/collectionType/:slug`}
          component={CollectionTypeRecursivePath}
        />
        <Route path={`/plugins/${pluginId}/singleType/:slug`} component={SingleTypeRecursivePath} />
        <Route path="" component={NotFound} />
      </Switch>
    </DndProvider>
  );
}

Main.propTypes = {
  getData: PropTypes.func.isRequired,
  getDataSucceeded: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  resetProps: PropTypes.func.isRequired,
};

const mapStateToProps = makeSelectMain();

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      getData,
      getDataSucceeded,
      resetProps,
    },
    dispatch
  );
}
const withConnect = connect(mapStateToProps, mapDispatchToProps);

export default compose(withConnect)(Main);
