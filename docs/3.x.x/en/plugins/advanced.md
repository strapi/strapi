# Plugin advanced usage

This section contains advanced resources to develop plugins.

## Handle user navigation

User navigation within your plugin can be managed by two different ways :
  - Using the [React Router V4 API](https://reacttraining.com/react-router/web/guides/philosophy)
  - Using the main router from the app

### Using React Router

[Link](https://reacttraining.com/react-router/web/api/Link) provides declarative, accessible navigation around your application :

```js
<Link to={{
  pathname: `/plugins/my-plugin/foo/${this.props.bar}`,
  search: '?foo=bar',
  hash: '#the-hash',
}} />

// Same as

<Link to=`/plugins/my-plugin/foo/${this.props.bar}?foo=bar#the-hash` />
```

[NavLink](https://reacttraining.com/react-router/web/api/NavLink) will add styling attributes to the rendered element when it matches the current URL.


```js
<NavLink
  to="/faq"
  activeClassName="selected"
>
  FAQs
</NavLink>
```

### Using the App Router

We use the app router if we want to make a redirection after some user actions (ex: after submitting a form).

**Path —** `./plugins/my-plugin/admin/src/containers/FooPage/index.js`.
```js
import React from 'react';
import { bindActionCreators } from 'redux';
import { connect, compose } from 'react-redux';
import PropTypes from 'prop-types';

// App router
import { router } from 'app';

// Components
import Input from 'components/inputs';
import Button from 'components/button';

// Utils
import injectSaga from 'utils/injectSaga';
import injectReducer from 'utils/injectReducer';

// Actions
import { changeInput, submitForm } from './actions';
// Sagas
import saga from './sagas';
// Selectors
import selectFooPage from './selectors';
// Reducer
import reducer from './reducer';

export class FooPage extends React.Component {
  handleSubmit = () => {
    this.props.handleSubmit();
    const hash = this.props.location.hash;
    const pathname = this.props.match.pathname;
    const search = '?foo=bar';
    router.push({ pathname, search, hash });
  }

  render() {
    return (
      <div>
        <form onSubmit={this.handleSubmit}>
          <Input
            value={this.state.value}
            handleChange={this.props.changeInput}
            validations={{ required: true }}
            label="Text field"
            target="data"
            type="text"
          />
          <Button primary onClick={this.handleSubmit}>Submit form</Button>
        </form>
      </div>
    )
  }
}

FooPage.propTypes = {
  changeInput: PropTypes.func.isRequired,
  location: PropTypes.object.isRequired,
  match: PropTypes.object.isRequired,
  submitForm: PropTypes.func.isRequired,
};

const mapStateToProps = selectFooPage();

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      changeInput,
      submitForm,
    },
    dispatch
  );
}

const withConnect = connect(mapStateToProps, mapDispatchToProps);
const withReducer = injectReducer({ key: 'fooPage', reducer });
const withSagas = injectSaga({ key: 'fooPage', saga });

export default compose(
  withReducer,
  withSagas,
  withConnect,
)(FooPage);
```

***

## Routeless container store injection

See the basic container's store injection [documentation](./development.md#using-redux-sagas).

If you have a container which can be a child of several other containers (i.e. it doesn't have a route); you'll have to inject it directly in the `./plugins/my-plugin/admin/src/containers/App/index.js` file as follows :

**Path —** `./plugins/my-plugin/admin/src/containers/App/index.js`.
```js
// ...
import fooReducer from 'containers/Foo/reducer';
import fooSaga from 'container/Foo/sagas';

import saga from './sagas';
import { makeSelectFoo } from './selectors';

// ...

export class App extends React.Component {
  render() {
    return (
      <div className={styles.app}>
        <Switch>
          {*/ List of all your routes here */}
        </Switch>
      </div>
    );
  }
}

// ...

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
    },
    dispatch
  );
}

const mapStateToProps = createStructuredSelector({
  // ...
});

const withConnect = connect(mapStateToProps, mapDispatchToProps);
// Foo reducer
const withFooReducer = injectReducer({ key: 'foo', reducer: fooReducer });
// Global reducer
const withReducer = injectReducer({ key: 'global', reducer });
// Foo saga
const withFooSaga = injectSaga({ key: 'foo', saga: fooSaga });
// Global saga
const withSaga = injectSaga({ key: 'global', saga });

export default compose(
  withFooReducer,
  withReducer,
  withFooSaga,
  withSaga,
  withConnect,
)(App);
```

***

## Execute a logic before mounting

You can execute a business logic before your plugin is being mounted.

### Usage

To do this, you need to create `bootstrap.js` file at the root of your `src` plugin's folder.
This file must contains a default functions that returns a `Promise`.

#### Example

In this example, we want to populate the left menu with links that will refer to our Content Types.

**Path —** `./app/plugins/content-manager/admin/src/bootstrap.js`.
```js
import { generateMenu } from 'containers/App/sagas';

// This method is executed before the load of the plugin
const bootstrap = (plugin) => new Promise((resolve, reject) => {
  generateMenu()
    .then(menu => {
      plugin.leftMenuSections = menu;

      resolve(plugin);
    })
    .catch(e => reject(e));
});

export default bootstrap;
```

***

## Prevent rendering

You can prevent your plugin from being rendered if some conditions aren't met.

### Usage

To disable your plugin's rendering, you can simply create `requirements.js` file at the root of your `src` plugin's folder.
This file must contain a default function that returns a `Promise`.

#### Example

Let's say that you want to disable your plugin if the server autoReload config is disabled in development mode.

**Path —** `./app/config/environments/development/server.json`.
```
{
  "host": "localhost",
  "port": 1337,
  "autoReload": {
    "enabled": true
  },
  "cron": {
    "enabled": false
  }
}
```

You'll first create a request to check if the `autoReload` config is enabled.

**Path —** `./app/plugins/my-plugin/config/routes.json`.
```json
{
  "routes": [
    {
      "method": "GET",
      "path": "/autoReload",
      "handler": "MyPlugin.autoReload",
      "config": {
        "policies": []
      }
    }
  ]
}
```
Then the associated handler:

**Path —** `./app/plugins/my-plugin/controllers/MyPlugin.js`.
```js
const _ = require('lodash');
const send = require('koa-send');

module.exports = {
  autoReload: async ctx => {
    ctx.send({ autoReload: _.get(strapi.config.environments, 'development.server.autoReload', false) });
  }
}
```

Finally, you'll create a file called `requirements.js`at the root of your plugin's src folder.

The default function exported must return a `Promise`.
If you wan't to prevent the plugin from being rendered you'll have to set `plugin.preventComponentRendering = true;`.
In this case, you'll have to set:
```js
plugin.blockerComponentProps = {
  blockerComponentTitle: 'my-plugin.blocker.title',
  blockerComponentDescription: 'my-plugin.blocker.description',
  blockerComponentIcon: 'fa-refresh',
};
```

To follow the example above:

**Path —** `./app/plugins/my-plugin/admin/src/requirements.js`.
```js
// Use our request helper
import request from 'utils/request';

const shouldRenderCompo = (plugin) => new Promise((resolve, request) => {
  request('/my-plugin/autoReload')
    .then(response => {
      // If autoReload is enabled the response is `{ autoReload: true }`
      plugin.preventComponentRendering = !response.autoReload;
      // Set the BlockerComponent props
      plugin.blockerComponentProps = {
        blockerComponentTitle: 'my-plugin.blocker.title',
        blockerComponentDescription: 'my-plugin.blocker.description',
        blockerComponentIcon: 'fa-refresh',
        blockerComponentContent: 'renderIde', // renderIde will add an ide section that shows the development environment server.json config
      };

      return resolve(plugin);
    })
    .catch(err => reject(err));
});

export default shouldRenderCompo;
```

### Customization

You can render your own custom blocker by doing as follows:

**Path —** `./app/plugins/my-plugin/admin/src/requirements.js`.
```js
// Use our request helper
import request from 'utils/request';

// Your custom blockerComponentProps
import MyCustomBlockerComponent from 'components/MyCustomBlockerComponent';

const shouldRenderCompo = (plugin) => new Promise((resolve, request) => {
  request('/my-plugin/autoReload')
    .then(response => {
      // If autoReload is enabled the response is `{ autoReload: true }`
      plugin.preventComponentRendering = !response.autoReload;

      // Tell which component to be rendered instead
      plugin.blockerComponent = MyCustomBlockerComponent;

      return resolve(plugin);
    })
    .catch(err => reject(err));
});

export default shouldRenderCompo;
```

***

## Using React/Redux and sagas

If your application is going to interact with some back-end application for data, we recommend using redux saga for side effect management.
This short tutorial will show how to fetch data using actions/reducer/sagas.

### Constants declaration

**Path —** `./plugins/my-plugin/admin/src/containers/FooPage/constants.js`
```js
export const DATA_FETCH = 'MyPlugin/FooPage/DATA_FETCH';
export const DATA_FETCH_ERROR = 'MyPlugin/FooPage/DATA_FETCH_ERROR';
export const DATA_FETCH_SUCCEEDED = 'MyPlugin/FooPage/DATA_FETCH_SUCCEEDED';
```

### Actions declaration

**Path —** `./plugins/my-plugin/admin/src/containers/FooPage/actions.js`
```js
import {
  DATA_FETCH,
  DATA_FETCH_ERROR,
  DATA_FETCH_SUCCEEDED,
} from './constants';

export function dataFetch(params) {
  return {
    type: DATA_FETCH,
    params,
  };
}

export function dataFetchError(errorMessage) {
  return {
    type: DATA_FETCH_ERROR,
    errorMessage,
  };
}

export function dataFetchSucceeded(data) {
  return {
    type: DATA_FETCH_SUCCEEDED,
    data,
  };
}
```

### Reducer

We strongly recommend to use [Immutable.js](https://facebook.github.io/immutable-js/) to structure your data.

**Path —** `./plugins/my-plugin/admin/src/containers/FooPage/reducer.js`
```js
import { fromJS, Map } from 'immutable';
import {
  DATA_FETCH_ERROR,
  DATA_FETCH_SUCCEEDED,
} from './constants';

const initialState = fromJS({
  data: Map({}),
  error: false,
  errorMessage: '',
  loading: true,
});

function fooPageReducer(state = initialState, action) {
  switch (action.type) {
    case DATA_FETCH_ERROR:
      return state
        .set('error', true)
        .set('errorMessage', action.errorMessage)
        .set('loading', false);
    case DATA_FETCH_SUCCEEDED:
      return state
        .set('data', Map(action.data))
        .set('error', false)
        .set('errorMessage', '')
        .set('loading', false);
      break;
    default:
      return state;
  }
}

export default fooPageReducer;
```

### Sagas

**Path —** `./plugins/my-plugin/admin/src/containers/FooPage/sagas.js`
```js
import { takeLatest } from 'redux-saga';
import { LOCATION_CHANGE } from 'react-router-redux';
import { put, fork, call, take, cancel } from 'redux-saga/effects';

// Use our request helper
import { request } from 'utils/request';

// Actions
import { dataFetchError, dataFetchSucceeded } from './actions';
import { DATA_FETCH } from './constants';

export function* fetchData(action) {
  try {
    const requestUrl = `/baseUrl/${action.params}`;
    const opts = {
      method: 'GET',
    };

    // Fetch data
    const response = yield call(request, requestUrl, opts);

    // Pass the response to the reducer
    yield put(dataFetchSucceeded(response));

  } catch(error) {
    yield put(dataFetchError(error));
  }
}

// Individual export for testing
function* defaultSaga() {
  // Listen to DATA_FETCH event
  const fetchDataWatcher = yield fork(takeLatest, DATA_FETCH, fetchData);

  // Cancel watcher
  yield take(LOCATION_CHANGE);

  yield cancel(fetchDataWatcher);
}

export default defaultSaga;
```

N.B. You can use a selector in your sagas :

```js
import { put, select, fork, call, take, cancel } from 'redux-saga/effects';
import { makeSelectUserName } from './selectors';

export function* foo() {
  try {
    const userName = yield select(makeSelectUserName());

    // ...
  } catch(error) {
    // ...
  }
}

function defaultSaga() {
  // ...
}

export default defaultSaga;
```


### Selectors

[Reselect](https://github.com/reactjs/reselect) is a library used for slicing your redux state and providing only the relevant sub-tree to a react component. It has three key features:

  1. Computational power
  2. Memoization
  3. Composability

Creating a selector:

**Path —** `./plugins/my-plugin/admin/src/containers/FooPage/selectors.js`
```js
import { createSelector } from 'reselect';

/**
* Direct selector to the fooPage state domain
*/
const selectFooPageDomain = () => state => state.get('fooPage');

/**
 * Other specific selectors
 */

 const makeSelectLoading = () => createSelector(
   selectFooPageDomain(),
   (substate) => substate.get('loading'),
 );

/**
 * Default selector used by FooPage
 */

const selectFooPage = () => createSelector(
  selectFooDomain(),
  (substate) => substate.toJS()
);

export default selectFooPage;
export { makeSelectLoading };

```


#### Example

**Path —** `./plugins/my-plugin/admin/src/containers/FooPage/index.js`
```js
import React from 'react';
import { bindActionCreators } from 'redux';
import { connect, compose } from 'react-redux';
import PropTypes from 'prop-types';

// Main router
import { router } from 'app';

// Utils
import injectSaga from 'utils/injectSaga';
import injectReducer from 'utils/injectReducer';

// Actions
import { dataFetch } from './actions';
// sagas
import saga from './sagas';
// Selectors
import selectFooPage from './selectors';
// Reducer
import reducer from './reducer';

export class FooPage extends React.Component {
  componentWillReceiveProps(nextProps) {
    if (this.props.error !== nextProps.error && nextProps.error) {
      window.Strapi.notification.error(nextProps.errorMessage);
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.match.pathname !== this.props.pathname) {
      this.props.dataFetch(this.props.match.params.bar);
    }
  }

  render() {
    if (this.props.error) return <div>An error occurred</div>;

    return (
      <div>
        <h4>Data display</h4>
        <span>{this.props.data.foo}</span>
        <span>{this.props.data.bar}</span>
      </div>
    );
  }

  FooPage.propTypes = {
    data: PropTypes.object.isRequired,
    dataFetch: PropTypes.func.isRequired,
    error: PropTypes.bool.isRequired,
    errorMessage: PropTypes.string.isRequired,
    match: PropTypes.object.isRequired,
  };

  const mapStateToProps = selectFoo();

  function mapDispatchToProps(dispatch) {
    return bindActionCreators(
      {
        dataFetch,
      },
      dispatch
    );
  }

  const withConnect = connect(mapStateToProps, mapDispatchToProps);
  const withReducer = injectReducer({ key: 'fooPage', reducer });
  const withSagas = injectSaga({ key: 'fooPage', saga });

  export default compose(
    withReducer,
    withSagas,
    withConnect,
  )(FooPage);
}
```
