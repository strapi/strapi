# Using the React Router V4

User navigation within your plugin can be managed by two different ways :
  - Using the [React Router V4 API](https://reacttraining.com/react-router/web/guides/philosophy)
  - Using the main router from the app

## Routing declaration

### Routing

The routing is based on [React Router V4](https://reacttraining.com/react-router/web/guides/philosophy), due to it's implementation each route is declared in the containers/App/index.js file.

Also, we chose to use the [Switch Router](https://reacttraining.com/react-router/web/api/Switch) because it renders a route exclusively.

Route declaration :

Let's say that you want to create a route /user with params /:id associated with the container User.

The declaration would be as followed :


  ```js
  // File : `plugins/my-plugin/admin/src/containers/App/index.js`.

  import UserPage from 'containers/UserPage'

  // ...

  render() {
    return (
      <div className={styles.myPlugin}>
        <Switch>
          <Route exact path="/plugins/my-plugin/user/:id" component={UserPage} />
        </Switch>
      </div>
    );
  }
  ```


### Using Redux/sagas

Due to React Router V4 your container's store is not directly injected.
To inject your container store if it's associated with a router you have to do it manually.

As an example, you created a Foo container associated with the route `/plugins/my-plugin/bar`, and you want to use redux/action/reducer/sagas.

Your `plugins/my-plugin/admin/src/containers/App/index.js` file will look as followed :

```js
// plugins/my-plugin/admin/src/containers/App/index.js

import FooPage from 'containers/FooPage'

// ...

render() {
  return (
    <div className={styles.myPlugin}>
      <Switch>
        <Route exact path="/plugins/my-plugin/bar" component={FooPage} />
      </Switch>
    </div>
  );

}
```

```js
// plugins/my-plugin/admin/src/containers/FooPage/index.js

import React from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { bindActionCreators, compose } from 'redux';
import PropTypes from 'prop-types';

// Utils to create your container store
import injectReducer from 'utils/injectReducer';
import injectSaga from 'utils/injectSaga';

import {
  foo,
  bar,
} from './actions';

import reducer from './reducer';

import saga from './sagas';
import { makeSelectFooPage } from './selectors';

// Styles
import styles from './styles.scss';

export class FooPage extends React.Component {
  render() {
    return (
      <div className={styles.fooPage}>
        Awesome container
      </div>
    );
  }
}

FooPage.propTypes = {
  fooPage: PropTypes.any,
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      foo,
      bar,
    },
    dispatch
  );
}

const mapStateToProps = createStructuredSelector({
  fooPage: makeSelectFooPage(),
});

const withConnect = connect(mapStateToProps, mapDispatchToProps);

// This is where you create your container store
// the key must correspond to your container name in lowerCase
const withSagas = injectSaga({ key: 'fooPage', saga });
const withReducer = injectReducer({ key: 'fooPage', reducer });

export default compose(
  withReducer,
  withSagas,
  withConnect,
)(FooPage);
```


Important : If you have a container which can be a child of several other containers (i.e. it doesn't have a route), in order to create the store
you'll have to inject it directly in the `plugins/my-plugin/admin/src/containers/App/index.js` file as follows :

```js
// containers/App/index.js

// ...

import fooPageReducer from 'containers/FooPage/reducer';
import fooPageSagas from 'container/FooPage/sagas';

import reducer from './reducer';
import saga from './sagas';

// ...

export class App extends React.Component {
  render() {
    // ...
  }
}

// ...

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {},
    dispatch
  );
}

const mapStateToProps = createStructuredSelector({
  // ...
});

const withConnect = connect(mapStateToProps, mapDispatchToProps);

// FooPage reducer
const withFooPageReducer = injectReducer({ key: 'fooPage', reducer: fooPageReducer });
// Global reducer
const withReducer = injectReducer({ key: 'global', reducer });
// FooPage sagas
const withFooPageSagas = injectSaga({ key: 'fooPage', saga: fooPageSagas });
// Global saga
const withSagas = injectSaga({ key: 'global', saga });

export default compose(
  withFooPageReducer,
  withReducer,
  withFooPageSagas,
  withSagas,
  withConnect,
)(App);
```

## Using React Router

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
  >FAQs</NavLink>
  ```
## Using the App Router

We use the app router if we want to make a redirection after some user's action (ex: after submitting a form).

```js
import React from 'react';
import { bindActionCreators } from 'redux';
import { connect, compose } from 'react-redux';
import PropTypes from 'prop-types';

// App router
import { router } from 'app';

// Utils
import injectSaga from 'utils/injectSaga';
import injectReducer from 'utils/injectReducer';

// Actions
import { foo, bar } from './actions';
// Sagas
import saga from './sagas';
// Selectors
import selectFoo from './Selectors';
// Reducer
import reducer from './reducer';

export class Foo extends React.Component {
  componentWillReceiveProps(nextProps) {
    if (nextProps.foo !== this.props.foo) {
      const hash = this.props.location.hash;
      const pathname = this.props.match.pathname;
      const search = '?foo=bar';
      router.push({ pathname, search, hash });
    }
  }

  render() {
    return <div>Hello</div>;
  }
}
Foo.propTypes = {
  foo: PropTypes.bool.isRequired,
  location: PropTypes.object.isRequired,
  match: PropTypes.object.isRequired,
};

const mapStateToProps = selectFoo();

function mapDispatchToProps(dispatch) {
  return bindActionCreators({}, dispatch);
}

const withConnect = connect(mapStateToProps, mapDispatchToProps);
const withReducer = injectReducer({ key: 'foo', reducer });
const withSagas = injectSaga({ key: 'foo', saga });

export default compose(
  withReducer,
  withSagas,
  withConnect,
)(Foo);
```
