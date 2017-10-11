# Redux-saga

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
