/**
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Switch, Route } from 'react-router-dom';
import pluginId from '../../pluginId';

// Containers
import AuthPage from '../AuthPage';
import EditPage from '../EditPage';
import HomePage from '../HomePage';
import NotFoundPage from '../NotFoundPage';

class App extends React.Component {
  componentDidMount() {
    if (!this.props.location.pathname.split('/')[3]) {
      this.props.history.push('/plugins/users-permissions/roles');
    }
  }

  componentDidUpdate() {
    if (!this.props.location.pathname.split('/')[3]) {
      this.props.history.push('/plugins/users-permissions/roles');
    }
  }

  render() {
    return (
      <div className={pluginId}>
        <Switch>
          <Route path={`/plugins/${pluginId}/auth/:authType/:id?`} component={AuthPage} exact />
          <Route path={`/plugins/${pluginId}/:settingType/:actionType/:id?`} component={EditPage} exact />
          <Route path={`/plugins/${pluginId}/:settingType`} component={HomePage} exact />
          <Route component={NotFoundPage} />
        </Switch>
      </div>
    );
  }
}

App.contextTypes = {
  plugins: PropTypes.object,
  router: PropTypes.object.isRequired,
  updatePlugin: PropTypes.func,
};

App.propTypes = {
  history: PropTypes.object.isRequired,
  location: PropTypes.object.isRequired,
};

export default App;
