# Redux saga

If your application is going to interact with some back-end application for data, we recommend using redux saga for side effect management.

## Example : fetching data on router change

This example will show how to fetch data using actions/reducer/sagas.

### Constants declaration

```js
// containers/Foo/constants.js
export const DATA_FETCH = 'MyPlugin/Foo/DATA_FETCH';
export const DATA_FETCH_ERROR = 'MyPlugin/Foo/DATA_FETCH_ERROR';
export const DATA_FETCH_SUCCEEDED = 'MyPlugin/Foo/DATA_FETCH_SUCCEEDED';
```

### Actions declaration

```js
// containers/Foo/actions.js
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

```js
// containers/Foo/reducer.js
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

function fooReducer(state = initialState, action) {
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

export default fooReducer;
```
### Sagas

```js
// container/Foo/sagas.js
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

N.B. You can use a selector in your saga :

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

  Creating a selector
  ```js
  import { createSelector } from 'reselect';

  /**
  * Direct selector to the foo state domain
  */
  const selectFooDomain = () => state => state.get('foo');

  /**
   * Other specific selectors
   */

   const makeSelectLoading = () => createSelector(
     selectFooDomain(),
     (substate) => substate.get('loading'),
   );

  /**
   * Default selector used by ModelPage
   */

  const selectFoo = () => createSelector(
    selectFooDomain(),
    (substate) => substate.toJS()
  );

  export default selectFoo;
  export { makeSelectLoading };

  ```


### INDEX.js

```js
// containers/Foo/index.js
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
import selectFoo from './selectors';
// Reducer
import reducer from './reducer';

export class Foo extends React.Component {
  componentWillReceiveProps(nextProps) {
    if (this.props.error !== nextProps.error && nextProps.error) {
      window.Strapi.notification.error(this.props.errorMessage);
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

  Foo.propTypes = {
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
  const withReducer = injectReducer({ key: 'foo', reducer });
  const withSagas = injectSaga({ key: 'foo', saga });

  export default compose(
    withReducer,
    withSagas,
    withConnect,
  )(Foo);
}

```
