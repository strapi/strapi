# Front-end Use Cases

This section gives use cases examples on front-end plugin development.

# Plugin advanced usage

This section contains advanced resources to develop plugins.

## Inject design

The `ExtendComponent` allows you to inject design from one plugin into another.

### Example

Let's say that you want to enable another plugin to inject a component into the top area of your plugin's container called `FooPage`;

**Path —** `./plugins/my-plugin/admin/src/containers/FooPage/actions.js`.
```js
import {
  ON_TOGGLE_SHOW_LOREM,
} from './constants';

export function onToggleShowLorem() {
  return {
    type: ON_TOGGLE_SHOW_LOREM,
  };
}
```

**Path —** `./plugins/my-plugin/admin/src/containers/FooPage/index.js`.
```js
import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { createStructuredSelector } from 'reselect';
import PropTypes from 'prop-types';

// Import the ExtendComponent
import ExtendComponent from 'components/ExtendComponent';

// Utils
import injectReducer from 'utils/injectReducer';

// Actions
import { onToggleShowLorem } from './action'

import reducer from './reducer';

// Selectors
import { makeSelectShowLorem } from './selectors';

class FooPage extends React.Component {
  render() {
    const lorem = this.props.showLorem ? <p>Lorem ipsum dolor sit amet, consectetur adipiscing</p> : '';
    return (
      <div>
        <h1>This is FooPage container</h1>
        <ExtendComponent
          area="top"
          container="FooPage"
          plugin="my-plugin"
          {...props}
        />
        {lorem}
      </div>
    );
  }
}

FooPage.propTypes = {
  onToggleShowLorem: PropTypes.func.isRequired,
  showLorem: PropTypes.bool.isRequired,
};

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      onToggleShowLorem,
    },
    dispatch,
  );
}

const mapStateToProps = createStructuredSelector({
  showLorem: makeSelectShowLorem(),
});

const withConnect = connect(mapDispatchToProps, mapDispatchToProps);
const withReducer = injectReducer({ key: 'fooPage', reducer });

export default compose(
  withReducer,
  withConnect,
)(FooPage);
```

**Path —** `./plugins/my-plugin/admin/src/containers/FooPage/reducer.js`.
```js
import { fromJS } from 'immutable';
import { ON_TOGGLE_SHOW_LOREM } from './constants';

const initialState = fromJS({
  showLorem: false,
});

function fooPageReducer(state= initialState, action) {
  switch (action.type) {
    case ON_TOGGLE_SHOW_LOREM:
      return state.set('showLorem', !state.get('showLorem'));
    default:
      return state;
  }
}

export default fooPageReducer;
```

**Path —** `./plugins/my-plugin/admin/src/containers/FooPage/selectors.js`.
```js
import  { createSelector } from 'reselect';

/**
* Direct selector to the fooPage state domain
*/

const selectFooPageDomain = () => state => state.get('fooPage');

/**
* Other specific selectors
*/

const makeSelectShowLorem = () => createSelector(
  selectFooPageDomain(),
  (substate) => substate.get('showLorem'),
);

export { makeSelectShowLorem };
```

That's all now your plugin's container is injectable!

Let's see how to inject a React Component from a plugin into another.


### Create your injectedComponent
**Path -** `./plugins/another-plugin/admin/src/extendables/BarContainer/index.js`;
```js
import React from 'react';
import PropTypes from 'prop-types';

// Import our Button component
import Button from 'components/Button';

// Other imports such as actions, selectors, sagas, reducer...

class BarContainer extends React.Component {
  render() {
    return (
      <div>
        <Button primary onClick={this.props.onToggleShowLorem}>
          Click me to show lorem paragraph
        </Button>
      </div>
    );
  }
}

BarContainer.propTypes = {
  onToggleShowLorem: PropTypes.func,
};

BarContainer.defaultProps = {
  onToggleShowLorem: () => {},
};

export default BarContainer;
```

### Tell the admin that you want to inject a React Component from a plugin into another

You have to create a file called `injectedComponents.js` at the root of your `another-plugin` src folder.

**Path —** `./plugins/another-plugin/admin/src/injectedComponents.js`.
```js
import BarContainer from 'extendables/BarContainer';

// export an array containing all the injected components
export default [
  {
    area: 'top',
    container: 'FooPage',
    injectedComponent: BarContainer,
    plugin: 'my-plugin',
  },
];
```
Just by doing so, the `another-plugin` will add a `Button` which toggles the `lorem` paragraph in the `FooPage` view.

***

## Routeless container store injection

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

## Execute logic before mounting the plugin

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

## Prevent plugin rendering

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
    ctx.send({ autoReload: _.get(strapi.config.currentEnvironment, 'server.autoReload', { enabled: false }) });
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
      // If autoReload is enabled the response is `{ autoReload: { enabled: true } }`
      plugin.preventComponentRendering = !response.autoReload.enabled;
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
      // If autoReload is enabled the response is `{ autoReload: { enabled: true } }`
      plugin.preventComponentRendering = !response.autoReload.enabled;

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
    default:
      return state;
  }
}

export default fooPageReducer;
```

### Sagas

**Path —** `./plugins/my-plugin/admin/src/containers/FooPage/sagas.js`
```js
import { LOCATION_CHANGE } from 'react-router-redux';
import { takeLatest, put, fork, call, take, cancel } from 'redux-saga/effects';

// Use our request helper
import request from 'utils/request';

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
      strapi.notification.error(nextProps.errorMessage);
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
