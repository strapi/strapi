# User navigation

User navigation within your plugin can be managed by two different ways :
  - Using the [React Router V4 API](https://reacttraining.com/react-router/web/guides/philosophy)
  - Using the main router from the app

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
