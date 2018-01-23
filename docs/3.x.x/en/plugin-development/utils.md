# Helpers

Strapi provides helpers so you don't have to develop again and again the same generic functions.

## Auth

`auth.js` lets you get, set and delete data in either the browser's `localStorage` or `sessionStorage`.

### Methods

| Name | Description |
| ---- | ----------- |
| clear(key) | Remove the data in either `localStorage` or `sessionStorage` |
| clearAppStorage() | Remove all data from both storage |
| clearToken() | Remove the user's `jwt Token` in the appropriate browser's storage |
| clearUserInfo() | Remove the user's info from storage |
| get(key) | Get the item in the browser's storage |
| getToken() | Get the user's `jwtToken` |
| getUserInfo() | Get the user's infos |
| set(value, key, isLocalStorage) | Set an item in the `sessionStorage`. If `true` is passed as the 3rd parameter it sets the value in the `localStorage` |
| setToken(value, isLocalStorage) | Set the user's `jwtToken` in the `sessionStorage`. If `true` is passed as the 2nd parameter it sets the value in the `localStorage` |
| setUserInfo(value, isLocalStorage) | Set the user's info in the `sessionStorage`. If `true` is passed as the 2nd parameter it sets the value in the `localStorage` |


```js
import auth from 'utils/auth';

// ...
//
auth.setToken('12345', true); // This will set 1234 in the browser's localStorage associated with the key: jwtToken
```

## Colors

This function allows to darken a color.

### Usage

```js
import { darken } from 'utils/colors';

const linkColor = darken('#f5f5f5', 1.5); // Will darken #F5F5F5 by 1.5% which gives #f2f2f2.
```

## Get URL Query Parameters

The helpers allows to retrieve the query parameters in the URL.

### Example

```js
import getQueryParameters from 'utils/getQueryParameters';

const URL = '/create?source=users-permissions';
const source = getQueryParameters(URL, 'source');

console.log(source); // users-permissions

```


## Request helper

A request helper is available to handle all requests inside a plugin.

It takes three arguments:
- `requestUrl`: The url we want to fetch.
- `options`: Please refer to this [documentation](https://github.com/github/fetch).
- `true`: This third argument is optional. If true is passed the response will be sent only if the server has restarted check out the [example](#example-with-server-autoreload-watcher).

### Usage

**Path -** `/plugins/my-plugin/admin/src/containers/**/sagas.js`.

```js
import { call, fork, put, takeLatest } from 'redux-saga/effects';

// Our request helper
import request from 'utils/request';
import { dataFetchSucceeded, dataFetchError } from './actions';
import { DATA_FETCH } from './constants';

export function* fetchData(action) {
  try {
    const opts = {
      method: 'GET',
    };
    const requestUrl = `/my-plugin/${action.endPoint}`;
    const data = yield call(request, requestUrl, opts);

    yield put(dataFetchSucceeded(data));
  } catch(error) {
    yield put(dataFetchError(error))
  }
}

// Individual exports for testing
function* defaultSaga() {
  yield fork(takeLatest, DATA_FETCH, fetchData);
}

export default defaultSaga;
```

### Simple example

Let's say that we have a container that fetches Content Type configurations depending on URL change.

#### Routing declaration:

Here we want to create a route `/content-type/:contentTypeName` for the `ContentTypePage` container.

**Path —** `./plugins/my-plugin/admin/src/container/App/index.js`.
```js
import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';

import { createStructuredSelector } from 'reselect';
import { Switch, Route, withRouter } from 'react-router-dom';
import PropTypes from 'prop-types';
import { pluginId } from 'app';

import ContentTypePage from 'containers/ContentTypePage';
import styles from './styles.scss';

class App extends React.Component {
  render() {
    return (
      <div className={`${pluginId} ${styles.app}`}>
        <Switch>
          <Route exact path="/plugins/my-plugin/content-type/:contentTypeName" component={ContentTypePage} />
        </Switch>
      </div>
    );
  }
}

App.contextTypes = {
  router: PropTypes.object.isRequired,
};

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {},
    dispatch
  );
}

const mapStateToProps = createStructuredSelector({});
const withConnect = connect(mapStateToProps, mapDispatchToProps);

export default compose(
  withConnect,
)(App);

```
***

#### Constants declaration:

Let's declare the needed constants to handle fetching data:

**Path —** `./plugins/my-plugin/admin/src/containers/ContentTypePage/constants.js`.
```js
export const DATA_FETCH = 'myPlugin/ContentTypePage/DATA_FETCH';
export const DATA_FETCH_ERROR = 'myPlugin/ContentTypePage/DATA_FETCH_ERROR';
export const DATA_FETCH_SUCCEEDED = 'myPlugin/ContentTypePage/DATA_FETCH_SUCCEEDED';
```
***

#### Actions declaration:

Let's declare our actions.

**Path —** `./plugins/my-plugin/admin/src/containers/ContentTypePage/actions.js`.
```js
import {
  DATA_FETCH,
  DATA_FETCH_ERROR,
  DATA_FETCH_SUCCEEDED,
} from './constants';

export function dataFetch(contentTypeName) {
  return {
    type: DATA_FETCH,
    contentTypeName,
  };
}

export function dataFetchError(errorMessage) {
  return {
    type: DATA_FETCH_ERROR,
    errorMessage,
  };
}

export function dataFetchSucceeded(data) {
  // data will look like { data: { name: 'User', description: 'Some description' } }
  return {
    type: DATA_FETCH_SUCCEEDED,
    data,
  };
}
```

***

#### Reducer setup:

Please refer to the [Immutable documentation](https://facebook.github.io/immutable-js/docs/#/) for informations about data structure.

**Path —** `./plugins/my-plugin/admin/src/containers/ContentTypePage/reducer.js`.
```js
import { fromJS, Map } from 'immutable';
import {
  DATA_FETCH,
  DATA_FETCH_ERROR,
  DATA_FETCH_SUCCEEDED
} from './constants';

const initialState = fromJS({
  contentTypeName,
  error: false,
  errorMessage: '',
  data: Map({}),
});

function contentTypePageReducer(state = initialState, action) {
  switch (action.type) {
    case DATA_FETCH:
      return state.set('contentTypeName', action.contentTypeName);
    case DATA_FETCH_ERROR:
      return state
        .set('error', true)
        .set('errorMessage', action.errorMessage);
    case DATA_FETCH_SUCCEEDED:
      return state
        .set('error', false)
        .set('data', Map(action.data.data));
    default:
      return state;
  }
}

export default contentTypePageReducer;
```

***

#### Selectors setup:

**Path —** `./plugins/my-plugin/admin/src/containers/ContentTypePage/selectors.js`.
```js
import { createSelector } from 'reselect';

/**
 * Direct selector to the contentTypePage state domain
 */
const selectContentTypePageDomain = () => state => state.get('contentTypePage');

/**
 * Other specific selectors
 */


/**
 * Default selector used by ContentTypePage
 */

const selectContentTypePage = () => createSelector(
  selectContentTypePageDomain(),
  (substate) => substate.toJS()
);

const makeSelectContentTypeName = () => createSelector(
  selectContentTypePageDomain(),
  (substate) => substate.get('contentTypeName');
)
export default selectContentTypePage;
export { makeSelectContentTypeName, selectContentTypePageDomain };
```

***

#### Handling route change:

**Path —** `./plugins/my-plugin/admin/src/containers/ContentTypePage/index.js`.
```js
import React from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { bindActionCreators, compose } from 'redux';
import { NavLink } from 'react-router-dom';
import PropTypes from 'prop-types';
import { map } from 'lodash';

// Utils to create the container's store
import injectSaga from 'utils/injectSaga';
import injectReducer from 'utils/injectReducer';

import { dataFetch } from './actions';
import { selectContentTypePage } from './selectors';
import saga from './sagas';
import reducer from './reducer';
import styles from './styles.scss';

export class ContentTypePage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);

    this.links = [
      {
        to: 'plugin/my-plugin/content-type/product',
        info: 'Product',
      },
      {
        to: 'plugin/my-plugin/content-type/user',
        info: 'User',
      },
    ];
  }

  componentDidMount() {
    this.props.dataFetch(this.props.match.params.contentTypeName);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.match.params.contentTypeName !== this.props.match.params.contentTypeName) {
      this.props.dataFetch(nextProps.match.params.contentTypeName);
    }
  }

  render() {
    return (
      <div className={styles.contentTypePage}>
        <div>
          <ul>
            {map(this.links, (link, key) => (
              <li key={key}>
                <NavLink to={link.to}>{link.info}</NavLink>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h1>{this.props.data.name}</h1>
          <p>{this.props.data.description}</p>
        </div>
      </div>
    );
  }
}

const mapStateToProps = selectContentTypePage();

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      dataFetch,
    },
    dispatch,
  );
}

ContentTypePage.propTypes = {
  data: PropTypes.object.isRequired,
  dataFetch: PropTypes.func.isRequired,
  match: PropTypes.object.isRequired,
};

const withConnect = connect(mapStateToProps, mapDispatchToProps);
const withSaga = injectSaga({ key: 'contentTypePage', saga });
const withReducer = injectReducer({ key: 'contentTypePage', reducer });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(ContentTypePage);
```

***

#### Fetching data:

The `sagas.js` file is in charge of fetching data.

**Path —** `./plugins/my-plugin/admin/src/containers/ContentTypePage/sagas.js`.
```js
import { LOCATION_CHANGE } from 'react-router-redux';
import { takeLatest, call, take, put, fork, cancel, select } from 'redux-saga/effects';
import request from 'utils/request';
import {
  dataFetchError,
  dataFetchSucceeded,
} from './actions';
import { DATA_FETCH } from './constants';
import { makeSelectContentTypeName } from './selectors';

export function* fetchData() {
  try {
    const opts = { method: 'GET' };

    // To make a POST request { method: 'POST', body: {Object} }

    const endPoint = yield select(makeSelectContentTypeName());
    const requestUrl = `my-plugin/**/${endPoint}`;

    // Fetching data with our request helper
    const data = yield call(request, requestUrl, opts);
    yield put(dataFetchSucceeded(data));
  } catch(error) {
    yield put(dataFetchError(error.message));
  }
}

function* defaultSaga() {
  const loadDataWatcher = yield fork(takeLatest, DATA_FETCH, fetchData);

  yield take(LOCATION_CHANGE);
  yield cancel(loadDataWatcher);
}

export default defaultSaga;
```

***

### Example with server autoReload watcher

Let's say that you want to develop a plugin that needs server restart on file change (like the settings-manager plugin) and you want to be aware of that to display some stuff..., you just have to send a third argument: `true` to our request helper and it will ping a dedicated route and send the response when the server has restarted.


**Path —** `./plugins/my-plugin/admin/src/containers/**/sagas.js`.
```js
import { takeLatest, call, take, put, fork, cancel, select } from 'redux-saga/effects';
import request from 'utils/request';
import {
  submitSucceeded,
  submitError,
} from './actions';
import { SUBMIT } from './constants';
// Other useful imports like selectors...
// ...

export function* postData() {
  try {
    const body = { data: 'someData' };
    const opts = { method: 'POST', body };
    const requestUrl = `**yourUrl**`;

    const response = yield call(request, requestUrl, opts, true);

    if (response.ok) {
      yield put(submitSucceeded());      
    } else {
      yield put(submitError('An error occurred'));
    }
  } catch(error) {
    yield put(submitError(error.message));
  }
}

function* defaultSaga() {
  yield fork(takeLatest, SUBMIT, postData);
  // ...
}

export default defaultSaga;
```
