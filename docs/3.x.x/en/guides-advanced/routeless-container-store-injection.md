# Plugin container store

See the basic container's store injection [documentation](../plugins/development.md#using-redux-sagas).

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
